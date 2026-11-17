import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

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

import { useErrorMessage } from "~/src/hooks/use-error-message"

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
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

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
    <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
      <Icon className="size-4 text-foreground" />
    </span>
  )
}

export const CourseForm = ({ course }: { readonly course?: Course["select"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form")
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const create = useMutation({
    ...createCourseMutation,
    onError,
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("created"))
      await router.navigate({ params: { courseId: id }, to: "/admin/courses/$courseId" })
    },
  })
  const update = useMutation({
    ...updateCourseMutation,
    onError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("saved"))
    },
  })

  const form = useForm({
    defaultValues: course === undefined ? NEW_COURSE : toValues(course),
    onSubmit: ({ value }) => {
      if (course === undefined) {
        create.mutate(value)
        return
      }
      update.mutate({ ...value, courseId: course.id })
    },
    validators: { onChange: courseZodSchemas.createCourse, onSubmit: courseZodSchemas.createCourse },
  })

  const listTab = (list: "outcomes" | "prerequisites", locale: SupportedLocale): JSX.Element => (
    <form.Field mode="array" name={`${list}.${locale}`}>
      {(field) => (
        <CourseListField addLabel={t(`${list}.add`)} field={field} label={t(`${list}.label`)} max={LOCALIZED_LIST_MAX_ITEMS}>
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
            <h2>{t("title")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <LocaleTabs label={t("titleLanguages")}>
              {(locale) => (
                <form.Field name={`title.${locale}`}>
                  {(field) => <CourseTextField field={field} id={`course-title-${locale}`} label={t("courseTitle")} lang={locale} />}
                </form.Field>
              )}
            </LocaleTabs>

            <LocaleTabs label={t("summaryLanguages")}>
              {(locale) => (
                <form.Field name={`summary.${locale}`}>
                  {(field) => <CourseTextAreaField field={field} id={`course-summary-${locale}`} label={t("summary")} lang={locale} />}
                </form.Field>
              )}
            </LocaleTabs>

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

            <LocaleTabs label={t("outcomes.languages")}>{(locale) => listTab("outcomes", locale)}</LocaleTabs>

            <LocaleTabs label={t("prerequisites.languages")}>{(locale) => listTab("prerequisites", locale)}</LocaleTabs>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button isPending={create.isPending || update.isPending} type="submit">
            {t(course === undefined ? "create" : "save")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
