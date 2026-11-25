import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { LOCALIZED_LIST_MAX_ITEMS } from "~/src/modules/_core/utils/localized-text"
import {
  COURSE_ICON,
  COURSE_ICONS,
  COURSE_KIND,
  COURSE_KINDS,
  COURSE_LEVEL,
  COURSE_LEVELS,
  COURSE_QUERY_KEYS,
  COURSE_STATUS,
  COURSE_STATUSES,
} from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { createCourseMutation } from "~/src/modules/course/use-cases/create-course"
import { updateCourseMutation } from "~/src/modules/course/use-cases/update-course"

import { useFormLocale } from "~/src/hooks/use-form-locale"
import { useSlugConflict } from "~/src/hooks/use-slug-conflict"

import { COURSE_ICON_COMPONENTS } from "~/src/data/course-icons"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import {
  CourseCompactField,
  CourseListField,
  CourseOptionField,
  CourseTextAreaField,
  CourseTextField,
  RemoveItemButton,
} from "~/src/presentation/components/custom/admin/courses/course-fields"
import { FormLanguages, TranslationsSheet } from "~/src/presentation/components/custom/admin/form-languages"

const LIST_NUMBER_BASE = 1

const NEW_COURSE: Course["createCourse"] = {
  icon: COURSE_ICON.BOOK_OPEN,
  kind: COURSE_KIND.COURSE,
  level: COURSE_LEVEL.BEGINNER,
  outcomes: {},
  prerequisites: {},
  slug: "",
  status: COURSE_STATUS.DRAFT,
  summary: { [I18N.DEFAULT_LOCALE]: "" },
  title: { [I18N.DEFAULT_LOCALE]: "" },
}

const toValues = (course: Course["select"]): Course["createCourse"] => ({
  icon: course.icon,
  kind: course.kind,
  level: course.level,
  outcomes: course.outcomes,
  prerequisites: course.prerequisites,
  slug: course.slug,
  status: course.status,
  summary: course.summary,
  title: course.title,
})

const CourseIconPreview = ({ icon }: { readonly icon: Course["select"]["icon"] }): JSX.Element => {
  const Icon = COURSE_ICON_COMPONENTS[icon]

  return (
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
      <Icon className="size-4 text-foreground" />
    </span>
  )
}

const useCourseForm = (course: Course["select"] | undefined) => {
  const t = useTranslations("pages.admin.courses.form")
  const router = useRouter()
  const queryClient = useQueryClient()
  const refuseTakenSlug = useSlugConflict({ controlId: "course-slug", message: "courseSlugTaken" })

  const create = useMutation({
    ...createCourseMutation,
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("created"))
      await router.navigate({ params: { courseId: id }, to: "/admin/courses/$courseId" })
    },
  })
  const update = useMutation({
    ...updateCourseMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("saved"))
    },
  })

  const form = useForm({
    defaultValues: course === undefined ? NEW_COURSE : toValues(course),
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      const onError = refuseTakenSlug(formApi)
      if (course === undefined) {
        create.mutate(value, { onError })
        return
      }
      update.mutate({ ...value, courseId: course.id }, { onError })
    },
    validators: { onChange: courseZodSchemas.createCourse },
  })

  const languages = useFormLocale(form, ({ outcomes, prerequisites, summary, title }) => ({
    lists: [outcomes, prerequisites],
    texts: { summary, title },
  }))

  return { form, isPending: create.isPending || update.isPending, languages }
}

type CourseFormApi = ReturnType<typeof useCourseForm>["form"]

interface CourseFieldsProps {
  readonly form: CourseFormApi
  readonly languages: ReturnType<typeof useCourseForm>["languages"]
}

const CourseList = ({ form, languages, list }: CourseFieldsProps & { readonly list: "outcomes" | "prerequisites" }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form")

  const { locale } = languages

  return (
    <form.Field key={locale} mode="array" name={`${list}.${locale}`}>
      {(field) => (
        <CourseListField addLabel={t(`${list}.add`)} field={field} label={t(`${list}.label`)} lang={locale} max={LOCALIZED_LIST_MAX_ITEMS}>
          {(index) => (
            <div className="flex items-start gap-2">
              <form.Field name={`${list}.${locale}[${index}]`}>
                {(item) => (
                  <CourseCompactField
                    field={item}
                    id={`course-${list}-${locale}-${String(index)}`}
                    label={t(`${list}.item`, { number: index + LIST_NUMBER_BASE })}
                    lang={locale}
                  />
                )}
              </form.Field>
              <RemoveItemButton
                label={t(`${list}.remove`, { number: index + LIST_NUMBER_BASE })}
                onRemove={() => {
                  field.removeValue(index)
                }}
              />
            </div>
          )}
        </CourseListField>
      )}
    </form.Field>
  )
}

const CourseTexts = ({ form, languages }: CourseFieldsProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form")

  const { locale, texts } = languages

  return (
    <>
      <FormLanguages languages={languages}>
        <TranslationsSheet
          fields={[
            { id: "title", label: t("courseTitle") },
            { id: "summary", label: t("summary") },
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
                  {text === "summary" && (
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
            id={`course-title-${locale}`}
            label={t("courseTitle")}
            lang={locale}
            source={texts.title[I18N.DEFAULT_LOCALE]}
          />
        )}
      </form.Field>
      <form.Field key={`summary-${locale}`} name={`summary.${locale}`}>
        {(field) => (
          <CourseTextAreaField
            field={field}
            id={`course-summary-${locale}`}
            label={t("summary")}
            lang={locale}
            source={texts.summary[I18N.DEFAULT_LOCALE]}
          />
        )}
      </form.Field>
    </>
  )
}

export const CourseForm = ({ course }: { readonly course?: Course["select"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form")

  const { form, isPending, languages } = useCourseForm(course)

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
            <h2>{t("title")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <CourseTexts form={form} languages={languages} />

            <form.Field name="slug">{(field) => <CourseTextField field={field} id="course-slug" isCode label={t("slug")} />}</form.Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="kind">
                {(field) => (
                  <CourseOptionField label={t("kind")} onChange={field.handleChange} options={COURSE_KINDS} value={field.state.value}>
                    {(kind) => t(`kinds.${kind}`)}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="status">
                {(field) => (
                  <CourseOptionField label={t("status")} onChange={field.handleChange} options={COURSE_STATUSES} value={field.state.value}>
                    {(status) => t(`statuses.${status}`)}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="level">
                {(field) => (
                  <CourseOptionField label={t("level")} onChange={field.handleChange} options={COURSE_LEVELS} value={field.state.value}>
                    {(level) => t(`levels.${level}`)}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="icon">
                {(field) => (
                  <div className="flex items-end gap-2">
                    <CourseOptionField label={t("icon")} onChange={field.handleChange} options={COURSE_ICONS} value={field.state.value}>
                      {(icon) => t(`icons.${icon}`)}
                    </CourseOptionField>
                    <CourseIconPreview icon={field.state.value} />
                  </div>
                )}
              </form.Field>
            </div>

            <CourseList form={form} languages={languages} list="outcomes" />

            <CourseList form={form} languages={languages} list="prerequisites" />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button isPending={isPending} type="submit">
            {t(course === undefined ? "create" : "save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
