import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { idField } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { LESSON_ACCESS, LESSON_ACCESS_LEVELS, LESSON_STATUS, LESSON_STATUSES } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useVideoLibrary } from "~/src/hooks/use-video-library"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { CourseOptionField, CourseTextAreaField, CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

const NO_VIDEO = "none"

const lessonFormSchema = lessonZodSchemas.createLesson.omit({ chapterId: true }).extend({ videoId: idField })

type LessonFormValues = Omit<Lesson["createLesson"], "chapterId" | "videoId"> & { videoId: string }

const NEW_LESSON: LessonFormValues = {
  access: LESSON_ACCESS.PAID,
  slug: "",
  status: LESSON_STATUS.DRAFT,
  summary: { [I18N.DEFAULT_LOCALE]: "" },
  title: { [I18N.DEFAULT_LOCALE]: "" },
  videoId: NO_VIDEO,
}

interface LessonDialogProps {
  readonly chapterId: string
  readonly trigger: ReactNode
}

export const LessonDialog = ({ chapterId, trigger }: LessonDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lesson")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isOpen, setOpen] = useState(false)

  const { holders } = useCourseAccessNames()
  const library = useVideoLibrary(isOpen)

  const onSuccess = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    toast.success(t("saved"))
    setOpen(false)
  }
  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const create = useMutation({ ...createLessonMutation, onError, onSuccess })

  const form = useForm({
    defaultValues: NEW_LESSON,
    onSubmit: ({ value: { videoId, ...fields } }) => {
      const video = videoId === NO_VIDEO ? {} : { videoId }
      create.mutate({ ...fields, ...video, chapterId })
    },
    validators: { onChange: lessonFormSchema, onSubmit: lessonFormSchema },
  })

  const videoLabels = new Map([[NO_VIDEO, t("noVideo")], ...library])

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      {trigger}
      <Dialog className="sm:max-w-2xl">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <LocaleTabs label={t("textLanguages")}>
              {(locale) => (
                <div className="flex flex-col gap-4">
                  <form.Field name={`title.${locale}`}>
                    {(field) => <CourseTextField field={field} id={`lesson-title-${locale}`} label={t("title")} lang={locale} />}
                  </form.Field>
                  <form.Field name={`summary.${locale}`}>
                    {(field) => <CourseTextAreaField field={field} id={`lesson-summary-${locale}`} label={t("summary")} lang={locale} />}
                  </form.Field>
                </div>
              )}
            </LocaleTabs>

            <form.Field name="slug">{(field) => <CourseTextField field={field} id="lesson-slug" isCode label={t("slug")} />}</form.Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <form.Field name="access">
                {(field) => (
                  <CourseOptionField
                    label={t("access")}
                    onChange={field.handleChange}
                    options={LESSON_ACCESS_LEVELS}
                    value={field.state.value}
                  >
                    {(access) => t(`accessLevels.${access}`, { holders })}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="status">
                {(field) => (
                  <CourseOptionField label={t("status")} onChange={field.handleChange} options={LESSON_STATUSES} value={field.state.value}>
                    {(status) => t(`statuses.${status}`)}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="videoId">
                {(field) => (
                  <CourseOptionField
                    label={t("video")}
                    onChange={field.handleChange}
                    options={[...videoLabels.keys()]}
                    value={field.state.value}
                  >
                    {(videoId) => videoLabels.get(videoId)}
                  </CourseOptionField>
                )}
              </form.Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button isPending={create.isPending} type="submit">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
