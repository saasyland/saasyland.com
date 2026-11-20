import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS_LEVELS, LESSON_KEY_MOMENTS_MAX_ITEMS, LESSON_STATUSES } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { updateLessonMutation } from "~/src/modules/lesson/use-cases/update-lesson"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useErrorMessage } from "~/src/hooks/use-error-message"

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
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

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
    onSubmit: ({ value }) => {
      update.mutate({ ...value, lessonId: lesson.id })
    },
    validators: { onChange: lessonFormSchema, onSubmit: lessonFormSchema },
  })

  return { form, isPending: update.isPending }
}

type LessonFormApi = ReturnType<typeof useLessonForm>["form"]

const KeyMomentsField = ({ form }: { readonly form: LessonFormApi }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.keyMoments")

  return (
    <form.Field mode="array" name="keyMoments">
      {(field) => (
        <FieldSet className="gap-3">
          <FieldLegend variant="label">{t("label")}</FieldLegend>
          <FieldDescription>{t("hint")}</FieldDescription>
          {field.state.value.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
          {field.state.value.length > 0 && (
            <LocaleTabs label={t("languages")}>
              {(locale) => (
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
                      <form.Field name={`keyMoments[${index}].label.${locale}`}>
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
            </LocaleTabs>
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

export const LessonForm = ({ lesson }: { readonly lesson: Course["editorLesson"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses")

  const { holders } = useCourseAccessNames()
  const { form, isPending } = useLessonForm(lesson)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
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
            <LocaleTabs label={t("lesson.textLanguages")}>
              {(locale) => (
                <div className="flex flex-col gap-4">
                  <form.Field name={`title.${locale}`}>
                    {(field) => <CourseTextField field={field} id={`lesson-title-${locale}`} label={t("lesson.title")} lang={locale} />}
                  </form.Field>
                  <form.Field name={`summary.${locale}`}>
                    {(field) => (
                      <CourseTextAreaField field={field} id={`lesson-summary-${locale}`} label={t("lesson.summary")} lang={locale} />
                    )}
                  </form.Field>
                  <form.Field name={`description.${locale}`}>
                    {(field) => (
                      <CourseRichTextField
                        field={field}
                        hint={t("lessonEditor.descriptionHint", DESCRIPTION_HINT)}
                        id={`lesson-description-${locale}`}
                        label={t("lessonEditor.description")}
                        lang={locale}
                        previewLabel={t("lessonEditor.descriptionPreview")}
                      />
                    )}
                  </form.Field>
                </div>
              )}
            </LocaleTabs>

            <form.Field name="slug">
              {(field) => <CourseTextField field={field} id="lesson-slug" isCode label={t("lesson.slug")} />}
            </form.Field>

            <div className="grid gap-4 sm:grid-cols-2">
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

            <KeyMomentsField form={form} />
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
