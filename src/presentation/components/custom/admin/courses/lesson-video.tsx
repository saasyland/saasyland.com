import { type JSX, Suspense, lazy } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { VideoPlayer as Player } from "@videojs/react/video"
import { FileText, RotateCcw, Trash2, Upload, X } from "lucide-react"
import { FileTrigger } from "react-aria-components"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { removeLessonVideoMutation } from "~/src/modules/lesson/use-cases/remove-lesson-video"
import { setLessonFormatMutation } from "~/src/modules/lesson/use-cases/set-lesson-format"
import { retryVideoUploadMutation } from "~/src/modules/video-upload/use-cases/retry-video-upload"
import { VIDEO_UPLOAD_ACCEPTED_TYPES, VIDEO_UPLOAD_FAILURE, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import { videoPlaybackQuery } from "~/src/modules/video/use-cases/get-video-playback"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFileSize } from "~/src/hooks/use-file-size"
import { LOCAL_UPLOAD_PHASE, type LocalVideoUpload, useVideoUpload } from "~/src/hooks/use-video-upload"

import { formatClock } from "~/src/lib/duration"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Progress, ProgressLabel, ProgressValue } from "~/src/presentation/components/shadcn/progress"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Switch } from "~/src/presentation/components/shadcn/switch"

import { VideoDropZone } from "~/src/presentation/components/custom/admin/courses/video-drop-zone"
import { VideoPickerDialog } from "~/src/presentation/components/custom/admin/courses/video-picker-dialog"
import { CopyButton } from "~/src/presentation/components/custom/copy-button"

const VideoPlayer = lazy(() =>
  import("~/src/presentation/components/custom/video-player").then((module) => ({ default: module.VideoPlayer })),
)

const PLAYER_SIZES = "(min-width: 80rem) 26rem, calc(100vw - 4rem)"

const ENCODE_COMMAND = `bun run video:encode:${import.meta.env.MODE}`

type EditorLesson = Course["editorLesson"]

type ServerUpload = NonNullable<EditorLesson["upload"]>

const useRefresh = () => {
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  return {
    onError: (error: Error) => toast.error(errorMessage(error)),
    refresh: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
  }
}

const PlayerPending = (): JSX.Element => <Skeleton className="aspect-video w-full rounded-md" />

const VideoPreview = ({ video }: { readonly video: NonNullable<EditorLesson["video"]> }): JSX.Element => {
  const { data } = useQuery(videoPlaybackQuery({ videoId: video.id }))

  if (data === undefined) {
    return <PlayerPending />
  }

  return (
    <Player poster={data.poster} title={video.title}>
      <Suspense fallback={<PlayerPending />}>
        <VideoPlayer className="overflow-hidden rounded-md" playback={data} sizes={PLAYER_SIZES} />
      </Suspense>
    </Player>
  )
}

const ReplaceButton = ({ label, onFile }: { readonly label: string; readonly onFile: (file: File) => void }): JSX.Element => (
  <FileTrigger
    acceptedFileTypes={VIDEO_UPLOAD_ACCEPTED_TYPES}
    onSelect={(files) => {
      const file = files?.[0]
      if (file !== undefined) {
        onFile(file)
      }
    }}
  >
    <Button size="sm" variant="outline">
      <Upload aria-hidden className="size-4" />
      {label}
    </Button>
  </FileTrigger>
)

const DeleteVideoButton = ({ lesson, video }: { readonly lesson: EditorLesson; readonly video: NonNullable<EditorLesson["video"]> }) => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")
  const others = video.lessonCount - 1
  const action = others > 0 ? "detach" : "remove"

  const { onError, refresh } = useRefresh()
  const remove = useMutation({
    ...removeLessonVideoMutation,
    onError,
    onSuccess: async ({ deleted }) => {
      await refresh()
      toast.success(t(deleted ? "removed" : "detached"))
    },
  })

  return (
    <AlertDialogTrigger>
      <Button className="hover:text-destructive" isPending={remove.isPending} size="sm" variant="ghost">
        <Trash2 aria-hidden className="size-4" />
        {t(action)}
      </Button>
      <AlertDialog>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(`${action}Title`)}</AlertDialogTitle>
          <AlertDialogDescription>{t(`${action}Body`, { count: others, title: video.title })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction
            onPress={() => {
              remove.mutate({ lessonId: lesson.id })
            }}
            variant="destructive"
          >
            {t(action)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </AlertDialogTrigger>
  )
}

const CurrentVideo = ({ lesson, video }: { readonly lesson: EditorLesson; readonly video: NonNullable<EditorLesson["video"]> }) => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")
  const format = useFormatter()
  const fileSize = useFileSize()

  const { start, upload } = useVideoUpload(lesson.id)

  return (
    <section aria-label={video.title} className="flex flex-col gap-3">
      <VideoPreview video={video} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
        <p className="text-spec text-muted-foreground tabular-nums">
          {t("details", {
            duration: formatClock(video.durationMs),
            height: video.height,
            size: fileSize(video.sizeBytes),
            width: video.width,
          })}
        </p>
        {video.captionLocales.length > 0 && (
          <p className="text-spec text-muted-foreground">{t("captions", { locales: format.list(video.captionLocales) })}</p>
        )}
        <Badge className="mt-1 self-start" variant="accent">
          {t("ready")}
        </Badge>
      </div>
      {upload === undefined && lesson.upload === undefined && (
        <div className="flex flex-wrap items-center gap-2">
          <ReplaceButton label={t("replace")} onFile={(file) => void start(file)} />
          <DeleteVideoButton lesson={lesson} video={video} />
        </div>
      )}
    </section>
  )
}

const UploadProgress = ({
  label,
  sizeBytes,
  uploadedBytes,
}: {
  readonly label: string
  readonly sizeBytes: number
  readonly uploadedBytes: number
}) => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")
  const fileSize = useFileSize()

  return (
    <Progress
      maxValue={sizeBytes}
      value={uploadedBytes}
      valueLabel={t("progress", { total: fileSize(sizeBytes), uploaded: fileSize(uploadedBytes) })}
    >
      <ProgressLabel className="min-w-0 truncate">{label}</ProgressLabel>
      <ProgressValue className="text-spec" />
    </Progress>
  )
}

const CancelButton = ({ lessonId, uploadId }: { readonly lessonId: string; readonly uploadId: string | undefined }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")
  const errorMessage = useErrorMessage()

  const { cancel } = useVideoUpload(lessonId)

  return (
    <Button
      onPress={() => {
        cancel(uploadId).then(
          () => toast.success(t("cancelled")),
          (error: unknown) => toast.error(errorMessage(error)),
        )
      }}
      size="sm"
      variant="ghost"
    >
      <X aria-hidden className="size-4" />
      {t("cancel")}
    </Button>
  )
}

const LocalUpload = ({ lessonId, upload }: { readonly lessonId: string; readonly upload: LocalVideoUpload }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")
  const errorMessage = useErrorMessage()

  const { start } = useVideoUpload(lessonId)

  return (
    <div className="flex flex-col gap-3" data-slot="video-upload">
      <UploadProgress
        label={t("uploading", { file: upload.file.name })}
        sizeBytes={upload.file.size}
        uploadedBytes={upload.uploadedBytes}
      />
      {upload.phase === LOCAL_UPLOAD_PHASE.UPLOADING && <p className="text-spec text-pretty text-muted-foreground">{t("keepOpen")}</p>}
      {upload.phase === LOCAL_UPLOAD_PHASE.FAILED && (
        <p className="text-spec text-pretty text-destructive" role="alert">
          {t("stopped", { reason: errorMessage(upload.error) })}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {upload.phase === LOCAL_UPLOAD_PHASE.FAILED && (
          <Button
            onPress={() => {
              void start(upload.file)
            }}
            size="sm"
            variant="outline"
          >
            <RotateCcw aria-hidden className="size-4" />
            {t("resumeUpload")}
          </Button>
        )}
        <CancelButton lessonId={lessonId} uploadId={upload.uploadId} />
      </div>
    </div>
  )
}

const EncoderCommand = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 py-1.5 pr-1.5 pl-3">
      <code className="min-w-0 truncate font-mono text-spec text-foreground">{ENCODE_COMMAND}</code>
      <CopyButton copiedLabel={t("copied")} copyLabel={t("copy")} value={ENCODE_COMMAND} />
    </div>
  )
}

const RetryButton = ({ uploadId }: { readonly uploadId: string }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")

  const { onError, refresh } = useRefresh()
  const retry = useMutation({ ...retryVideoUploadMutation, onError, onSuccess: refresh })

  return (
    <Button
      isPending={retry.isPending}
      onPress={() => {
        retry.mutate({ uploadId })
      }}
      size="sm"
      variant="outline"
    >
      <RotateCcw aria-hidden className="size-4" />
      {t("retry")}
    </Button>
  )
}

const StoredUpload = ({ lessonId, upload }: { readonly lessonId: string; readonly upload: ServerUpload }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")

  const { start } = useVideoUpload(lessonId)

  const file = { file: upload.fileName }

  return (
    <div className="flex flex-col gap-3" data-slot="video-upload">
      {upload.status === VIDEO_UPLOAD_STATUS.UPLOADING && (
        <>
          <UploadProgress label={t("uploading", file)} sizeBytes={upload.sizeBytes} uploadedBytes={upload.uploadedBytes} />
          <p className="text-spec text-pretty text-muted-foreground">{t("interrupted", file)}</p>
        </>
      )}
      {upload.status === VIDEO_UPLOAD_STATUS.QUEUED && (
        <>
          <Badge className="self-start" variant="warning">
            {t("queued")}
          </Badge>
          <p className="text-spec text-pretty text-muted-foreground">{t("queuedHint", file)}</p>
          <EncoderCommand />
        </>
      )}
      {upload.status === VIDEO_UPLOAD_STATUS.ENCODING && (
        <Progress isIndeterminate>
          <ProgressLabel className="min-w-0 truncate">{t("encoding", file)}</ProgressLabel>
        </Progress>
      )}
      {upload.status === VIDEO_UPLOAD_STATUS.ENCODING && <p className="text-spec text-pretty text-muted-foreground">{t("encodingHint")}</p>}
      {upload.status === VIDEO_UPLOAD_STATUS.FAILED && (
        <>
          <Badge className="self-start" variant="destructive">
            {t("failed")}
          </Badge>
          <p className="text-spec text-pretty text-destructive" role="alert">
            {t(`failures.${upload.failure ?? VIDEO_UPLOAD_FAILURE.ENCODING}`, file)}
          </p>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {upload.status === VIDEO_UPLOAD_STATUS.UPLOADING && <ReplaceButton label={t("resume")} onFile={(chosen) => void start(chosen)} />}
        {upload.status === VIDEO_UPLOAD_STATUS.FAILED && <RetryButton uploadId={upload.id} />}
        {upload.status === VIDEO_UPLOAD_STATUS.FAILED && (
          <ReplaceButton label={t("uploadAnother")} onFile={(chosen) => void start(chosen)} />
        )}
        <CancelButton lessonId={lessonId} uploadId={upload.id} />
      </div>
    </div>
  )
}

const NoVideoSwitch = ({ lesson }: { readonly lesson: EditorLesson }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video.noVideo")

  const { upload } = useVideoUpload(lesson.id)
  const { onError, refresh } = useRefresh()
  const setFormat = useMutation({ ...setLessonFormatMutation, onError, onSuccess: refresh })

  const isText = lesson.format === LESSON_FORMAT.TEXT
  const hasVideo = lesson.video !== null || lesson.upload !== undefined || upload !== undefined

  return (
    <div className="flex flex-col gap-1.5">
      <Switch
        isDisabled={hasVideo || setFormat.isPending}
        isSelected={isText}
        onChange={(isSelected) => {
          setFormat.mutate({ format: isSelected ? LESSON_FORMAT.TEXT : LESSON_FORMAT.VIDEO, lessonId: lesson.id })
        }}
        size="sm"
      >
        <span className="text-sm font-medium text-foreground">{t("label")}</span>
      </Switch>
      <p className="text-spec text-pretty text-muted-foreground">{hasVideo ? t("locked") : t("description")}</p>
    </div>
  )
}

const VideoSlot = ({ lesson }: { readonly lesson: EditorLesson }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")

  const { start, upload } = useVideoUpload(lesson.id)

  if (lesson.format === LESSON_FORMAT.TEXT) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
        <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-pretty text-muted-foreground">{t("text")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {lesson.video !== null && <CurrentVideo lesson={lesson} video={lesson.video} />}
      {upload !== undefined && <LocalUpload lessonId={lesson.id} upload={upload} />}
      {upload === undefined && lesson.upload !== undefined && <StoredUpload lessonId={lesson.id} upload={lesson.upload} />}
      {lesson.video === null && upload === undefined && lesson.upload === undefined && (
        <VideoDropZone label={t("drop.label")} onFile={(file) => void start(file)} />
      )}
    </div>
  )
}

export const LessonVideo = ({ lesson }: { readonly lesson: EditorLesson }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video")

  const { upload } = useVideoUpload(lesson.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <VideoSlot lesson={lesson} />
        {lesson.format === LESSON_FORMAT.VIDEO && upload === undefined && lesson.upload === undefined && (
          <VideoPickerDialog lesson={lesson} />
        )}
      </CardContent>
      <CardFooter>
        <NoVideoSwitch lesson={lesson} />
      </CardFooter>
    </Card>
  )
}
