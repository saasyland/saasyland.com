import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_KIND, COURSE_QUERY_KEYS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { COURSE_KINDS, COURSE_STATUSES } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { createCourseMutation } from "~/src/modules/course/use-cases/create-course"
import { updateCourseMutation } from "~/src/modules/course/use-cases/update-course"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { CourseOptionField, CourseTextAreaField, CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

const NEW_COURSE: Course["createCourse"] = {
  kind: COURSE_KIND.COURSE,
  slug: "",
  status: COURSE_STATUS.DRAFT,
  summary: { [I18N.DEFAULT_LOCALE]: "" },
  title: { [I18N.DEFAULT_LOCALE]: "" },
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
    defaultValues: course ?? NEW_COURSE,
    onSubmit: ({ value }) => {
      const fields = { kind: value.kind, slug: value.slug, status: value.status, summary: value.summary, title: value.title }
      if (course === undefined) {
        create.mutate(fields)
        return
      }
      update.mutate({ ...fields, courseId: course.id })
    },
    validators: { onChange: courseZodSchemas.createCourse, onSubmit: courseZodSchemas.createCourse },
  })

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
            </div>
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
