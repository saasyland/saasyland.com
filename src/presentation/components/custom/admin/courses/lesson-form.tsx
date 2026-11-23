import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS_LEVELS, LESSON_FORMAT, LESSON_KEY_MOMENTS_MAX_ITEMS, LESSON_STATUSES } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { updateLessonMutation } from "~/src/modules/lesson/use-cases/update-lesson"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useErrorMessage } from "~/src/hooks/use-error-message"
import { type FormLocale, useFormLocale } from "~/src/hooks/use-form-locale"

import { MILLISECONDS_PER_SECOND, formatClock } from "~/src/lib/duration"
import { RICH_TEXT_CODE_MARK } from "~/src/lib/rich-text"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "~/src/presentation/components/shadcn/field"

import {
  CourseCompactField,
  CourseOptionField,
  CourseRichTextField,
  CourseTextAreaField,
  CourseTextField,
  RemoveItemButton,
} from "~/src/presentation/components/custom/admin/courses/course-fields"
import { FormLanguages, TranslationsSheet } from "~/src/presentation/components/custom/admin/form-languages"

const MOMENT_NUMBER_BASE = 1
const DESCRIPTION_HINT = { example: `${RICH_TEXT_CODE_MARK}bun run dev${RICH_TEXT_CODE_MARK}`, mark: RICH_TEXT_CODE_MARK }

const lessonFormSchema = lessonZodSchemas.updateLesson.omit({ lessonId: true })

type LessonFormValues = Omit<Lesson["updateLesson"], "lessonId">

const toValues = (lesson: Course["editorLesson"]): LessonFormValues => ({
  access: lesson.access,
  description: lesson.description,
  keyMoments: lesson.keyMoments.map(({ label, seconds }) => ({ at: formatClock(seconds * MILLISECONDS_PER_SECOND), label })),
  slug: lesson.slug,
  status: lesson.status,
  summary: lesson.summary,
  title: lesson.title,
})

const useLessonForm = (lesson: Course["editorLesson"]) => {
  const t = useTranslations("pages.admin.courses.lessonEditor")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const update = useMutation({
    ...updateLessonMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("saved"))
    },
  })

  const form = useForm({
    defaultValues: toValues(lesson),
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      update.mutate({ ...value, lessonId: lesson.id })
    },
    validators: { onChange: lessonFormSchema },
  })

  const languages = useFormLocale(form, ({ description, keyMoments, summary, title }) => ({
    lists: keyMoments.map(({ label }) => label),
    texts: { description, summary, title },
  }))

  return { form, isPending: update.isPending, languages }
}

type LessonFormApi = ReturnType<typeof useLessonForm>["form"]

const KeyMomentsField = ({ form, locale }: { readonly form: LessonFormApi; readonly locale: SupportedLocale }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.keyMoments")

  return (
    <form.Field mode="array" name="keyMoments">
      {(field) => (
        <FieldSet className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <FieldLegend className="mb-0" variant="label">
              {t("label")}
            </FieldLegend>
            <span className="font-mono text-spec text-muted-foreground">{locale}</span>
          </div>
          <FieldDescription>{t("hint")}</FieldDescription>
          {field.state.value.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {field.state.value.length > 0 && (
            <ol className="flex flex-col gap-2">
              {field.state.value.map((_, index) => (
                <li className="flex items-start gap-2" key={index}>
                  <div className="w-24 shrink-0">
                    <form.Field name={`keyMoments[${index}].at`}>
                      {(at) => (
                        <CourseCompactField
                          field={at}
                          id={`key-moment-at-${String(index)}`}
                          isCode
                          label={t("at", { number: index + MOMENT_NUMBER_BASE })}
                        />
                      )}
                    </form.Field>
                  </div>
                  <form.Field key={locale} name={`keyMoments[${index}].label.${locale}`}>
                    {(label) => (
                      <CourseCompactField
                        field={label}
                        id={`key-moment-label-${locale}-${String(index)}`}
                        label={t("title", { number: index + MOMENT_NUMBER_BASE })}
                        lang={locale}
                      />
                    )}
                  </form.Field>
                  <RemoveItemButton
                    label={t("remove", { number: index + MOMENT_NUMBER_BASE })}
                    onRemove={() => {
                      field.removeValue(index)
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
          <Button
            className="self-start"
            isDisabled={field.state.value.length >= LESSON_KEY_MOMENTS_MAX_ITEMS}
            onPress={() => {
              field.pushValue({ at: "", label: { [I18N.DEFAULT_LOCALE]: "" } })
            }}
            size="sm"
            variant="outline"
          >
            {t("add")}
          </Button>
        </FieldSet>
      )}
    </form.Field>
  )
}

interface LessonTextsProps {
  readonly form: LessonFormApi
  readonly languages: FormLocale<"description" | "summary" | "title">
}

const LessonTexts = ({ form, languages }: LessonTextsProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses")

  const { locale, texts } = languages

  return (
    <>
      <FormLanguages languages={languages}>
        <TranslationsSheet
          fields={[
            { id: "title", label: t("lesson.title") },
            { id: "summary", label: t("lesson.summary") },
            { id: "description", label: t("lessonEditor.description") },
          ]}
          languages={languages}
        >
          {(text, language, label) => (
            <form.Field name={`${text}.${language}`}>
              {(field) => (
                <>
                  {text === "title" && (
                    <CourseTextField field={field} id={`translation-${text}-${language}`} label={label} lang={language} />
                  )}
                  {text !== "title" && (
                    <CourseTextAreaField field={field} id={`translation-${text}-${language}`} label={label} lang={language} />
                  )}
                </>
              )}
            </form.Field>
          )}
        </TranslationsSheet>
      </FormLanguages>
      <form.Field key={`title-${locale}`} name={`title.${locale}`}>
        {(field) => (
          <CourseTextField
            field={field}
            id={`lesson-title-${locale}`}
            label={t("lesson.title")}
            lang={locale}
            source={texts.title[I18N.DEFAULT_LOCALE]}
          />
        )}
      </form.Field>
      <form.Field key={`summary-${locale}`} name={`summary.${locale}`}>
        {(field) => (
          <CourseTextAreaField
            field={field}
            id={`lesson-summary-${locale}`}
            label={t("lesson.summary")}
            lang={locale}
            source={texts.summary[I18N.DEFAULT_LOCALE]}
          />
        )}
      </form.Field>
      <form.Field key={`description-${locale}`} name={`description.${locale}`}>
        {(field) => (
          <CourseRichTextField
            field={field}
            hint={t("lessonEditor.descriptionHint", DESCRIPTION_HINT)}
            id={`lesson-description-${locale}`}
            label={t("lessonEditor.description")}
            lang={locale}
            previewLabel={t("lessonEditor.descriptionPreview")}
            source={texts.description[I18N.DEFAULT_LOCALE]}
          />
        )}
      </form.Field>
    </>
  )
}

export const LessonForm = ({ lesson }: { readonly lesson: Course["editorLesson"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses")

  const { holders } = useCourseAccessNames()
  const { form, isPending, languages } = useLessonForm(lesson)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form, languages.showFirstInvalid)
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("lessonEditor.details")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <LessonTexts form={form} languages={languages} />

            <form.Field name="slug">
              {(field) => <CourseTextField field={field} id="lesson-slug" isCode label={t("lesson.slug")} />}
            </form.Field>

            <div className="grid gap-4 @lg/field-group:grid-cols-2">
              <form.Field name="access">
                {(field) => (
                  <CourseOptionField
                    label={t("lesson.access")}
                    onChange={field.handleChange}
                    options={LESSON_ACCESS_LEVELS}
                    value={field.state.value}
                  >
                    {(access) => t(`lesson.accessLevels.${access}`, { holders })}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="status">
                {(field) => (
                  <CourseOptionField
                    label={t("lesson.status")}
                    onChange={field.handleChange}
                    options={LESSON_STATUSES}
                    value={field.state.value}
                  >
                    {(status) => t(`lesson.statuses.${status}`)}
                  </CourseOptionField>
                )}
              </form.Field>
            </div>

            {lesson.format === LESSON_FORMAT.VIDEO && <KeyMomentsField form={form} locale={languages.locale} />}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button isPending={isPending} type="submit">
            {t("lesson.save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
