import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { idField } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { LESSON_ACCESS_LEVELS, LESSON_STATUSES } from "~/src/modules/lesson/lesson.schema"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"
import { updateLessonMutation } from "~/src/modules/lesson/use-cases/update-lesson"
import { getVideosPageQuery } from "~/src/modules/video/use-cases/get-videos"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { formatClock } from "~/src/lib/duration"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { CourseOptionField, CourseTextAreaField, CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

const VIDEO_LIBRARY_PAGE_SIZE = 100
const NO_VIDEO = "none"

const lessonFormSchema = lessonZodSchemas.updateLesson.omit({ lessonId: true }).extend({ videoId: idField })

type EditorLesson = Course["editor"]["chapters"][number]["lessons"][number]

type LessonFormValues = Omit<Lesson["createLesson"], "chapterId" | "videoId"> & { videoId: string }

const NEW_LESSON: LessonFormValues = {
  access: LESSON_ACCESS.PAID,
  slug: "",
  status: LESSON_STATUS.DRAFT,
  summary: { [I18N.DEFAULT_LOCALE]: "" },
  title: { [I18N.DEFAULT_LOCALE]: "" },
  videoId: NO_VIDEO,
}

const toValues = (lesson: EditorLesson): LessonFormValues => ({
  access: lesson.access,
  slug: lesson.slug,
  status: lesson.status,
  summary: lesson.summary,
  title: lesson.title,
  videoId: lesson.video?.id ?? NO_VIDEO,
})

interface LessonDialogProps {
  readonly chapterId: string
  readonly lesson?: EditorLesson
  readonly trigger: ReactNode
}

export const LessonDialog = ({ chapterId, lesson, trigger }: LessonDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lesson")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isOpen, setOpen] = useState(false)

  const { data: videos } = useQuery({ ...getVideosPageQuery({ pageSize: VIDEO_LIBRARY_PAGE_SIZE }), enabled: isOpen })

  const onSuccess = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    toast.success(t("saved"))
    setOpen(false)
  }
  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const create = useMutation({ ...createLessonMutation, onError, onSuccess })
  const update = useMutation({ ...updateLessonMutation, onError, onSuccess })

  const form = useForm({
    defaultValues: lesson === undefined ? NEW_LESSON : toValues(lesson),
    onSubmit: ({ value: { videoId, ...fields } }) => {
      const video = videoId === NO_VIDEO ? {} : { videoId }
      if (lesson === undefined) {
        create.mutate({ ...fields, ...video, chapterId })
        return
      }
      update.mutate({ ...fields, ...video, lessonId: lesson.id })
    },
    validators: { onChange: lessonFormSchema, onSubmit: lessonFormSchema },
  })

  const videoLabels = new Map([
    [NO_VIDEO, t("noVideo")],
    ...(videos?.rows.map((video): [string, string] => [video.id, `${video.title} · ${formatClock(video.durationMs)}`]) ?? []),
  ])

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
            <DialogTitle>{t(lesson === undefined ? "add" : "edit")}</DialogTitle>
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
                    {(access) => t(`accessLevels.${access}`)}
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
            <Button isPending={create.isPending || update.isPending} type="submit">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
