import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { replaceLessonVideoMutation } from "~/src/modules/lesson/use-cases/replace-lesson-video"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useVideoLabel, useVideoLibrary } from "~/src/hooks/use-video-library"

import { ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { CourseOptionField } from "~/src/presentation/components/custom/admin/courses/course-fields"

const replacementSchema = lessonZodSchemas.replaceLessonVideo.pick({ videoId: true })

const CurrentVideo = ({ video }: { readonly video: Course["editorLesson"]["video"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")
  const videoLabel = useVideoLabel()
  const recording = video === null || video.placeholder

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-sm font-medium text-foreground">{video === null ? t("none") : videoLabel(video)}</p>
      <Badge
        className={cn("self-start text-[10px]", {
          [ADMIN_STATUS_BADGE_CLASSES.amber]: recording,
          [ADMIN_STATUS_BADGE_CLASSES.emerald]: !recording,
        })}
        variant="outline"
      >
        {t(recording ? "recording" : "playable")}
      </Badge>
    </div>
  )
}

export const LessonVideoCard = ({ lesson }: { readonly lesson: Course["editorLesson"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const library = useVideoLibrary(true)

  const replace = useMutation({
    ...replaceLessonVideoMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("replaced"))
    },
  })

  const form = useForm({
    defaultValues: { videoId: lesson.video?.id ?? "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      replace.mutate({ lessonId: lesson.id, videoId: value.videoId })
    },
    validators: { onChange: replacementSchema },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CurrentVideo video={lesson.video} />
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            void submitForm(event, form)
          }}
        >
          <form.Field name="videoId">
            {(field) => (
              <CourseOptionField
                label={t("replacement")}
                onChange={field.handleChange}
                options={[...library.keys()]}
                value={field.state.value}
              >
                {(videoId) => library.get(videoId)}
              </CourseOptionField>
            )}
          </form.Field>
          <form.Subscribe selector={(state) => state.values.videoId}>
            {(videoId) => (
              <Button
                className="self-start"
                isDisabled={videoId === "" || videoId === lesson.video?.id}
                isPending={replace.isPending}
                size="sm"
                type="submit"
              >
                {t("replace")}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  )
}
