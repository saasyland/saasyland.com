import { type JSX, useState } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Library, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { replaceLessonVideoMutation } from "~/src/modules/lesson/use-cases/replace-lesson-video"
import { deleteVideoMutation } from "~/src/modules/video/use-cases/delete-video"
import { getVideosPageQuery } from "~/src/modules/video/use-cases/get-videos"
import { VIDEO_LIBRARY_PAGE_SIZE, VIDEO_QUERY_KEYS } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { useErrorMessage } from "~/src/hooks/use-error-message"

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
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const LIBRARY_QUERY = getVideosPageQuery({ pageSize: VIDEO_LIBRARY_PAGE_SIZE })

const PENDING_ROWS = ["first", "second", "third"] as const

type LibraryVideo = Video["libraryVideo"]

const useInvalidate = () => {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
      queryClient.invalidateQueries({ queryKey: VIDEO_QUERY_KEYS.ALL }),
    ])
}

const DeleteUnusedVideo = ({ video }: { readonly video: LibraryVideo }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video.picker")
  const errorMessage = useErrorMessage()
  const invalidate = useInvalidate()

  const remove = useMutation({
    ...deleteVideoMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await invalidate()
      toast.success(t("deleted", { title: video.title }))
    },
  })

  return (
    <AlertDialogTrigger>
      <Button
        aria-label={t("delete", { title: video.title })}
        className="size-8 text-muted-foreground hover:text-destructive"
        isPending={remove.isPending}
        size="icon"
        variant="ghost"
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
      <AlertDialog>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteBody", { title: video.title })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction
            onPress={() => {
              remove.mutate({ videoId: video.id })
            }}
            variant="destructive"
          >
            {t("confirmDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </AlertDialogTrigger>
  )
}

interface VideoRowProps {
  readonly isCurrent: boolean
  readonly isPending: boolean
  readonly onUse: () => void
  readonly video: LibraryVideo
}

const VideoRow = ({ isCurrent, isPending, onUse, video }: VideoRowProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video.picker")

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
        <p className="text-spec text-muted-foreground tabular-nums">
          {formatClock(video.durationMs)} · {video.width}×{video.height}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {video.lessonCount === 0 && <DeleteUnusedVideo video={video} />}
        <Button
          aria-label={t("useLabel", { title: video.title })}
          isDisabled={isCurrent}
          isPending={isPending}
          onPress={onUse}
          size="sm"
          variant="outline"
        >
          {t("use")}
        </Button>
      </div>
      <p className="col-span-2 flex flex-wrap gap-1.5">
        {isCurrent && <Badge variant="accent">{t("current")}</Badge>}
        <Badge variant={video.lessonCount === 0 ? "warning" : "neutral"}>{t("usage", { count: video.lessonCount })}</Badge>
      </p>
    </li>
  )
}

const VideoList = ({ lesson, onUsed }: { readonly lesson: Course["editorLesson"]; readonly onUsed: () => void }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video.picker")
  const errorMessage = useErrorMessage()
  const invalidate = useInvalidate()
  const [query, setQuery] = useState("")

  const { data } = useQuery(LIBRARY_QUERY)
  const replace = useMutation({
    ...replaceLessonVideoMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await invalidate()
      toast.success(t("used"))
      onUsed()
    },
  })

  if (data === undefined) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        {PENDING_ROWS.map((row) => (
          <Skeleton className="h-12 w-full rounded-md" key={row} />
        ))}
      </div>
    )
  }

  const needle = query.trim().toLocaleLowerCase()
  const videos = data.rows.filter((video) => video.title.toLocaleLowerCase().includes(needle))

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Input
        aria-label={t("search")}
        onChange={(event) => {
          setQuery(event.target.value)
        }}
        placeholder={t("search")}
        type="search"
        value={query}
      />
      {data.rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      {data.rows.length > 0 && videos.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noMatch", { query })}</p>
      )}
      {videos.length > 0 && (
        <ul className="max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain pr-1">
          {videos.map((video) => (
            <VideoRow
              isCurrent={video.id === lesson.video?.id}
              isPending={replace.isPending && replace.variables.videoId === video.id}
              key={video.id}
              onUse={() => {
                replace.mutate({ lessonId: lesson.id, videoId: video.id })
              }}
              video={video}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export const VideoPickerDialog = ({ lesson }: { readonly lesson: Course["editorLesson"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video.picker")
  const [isOpen, setOpen] = useState(false)

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button className="self-start" size="sm" variant="ghost">
        <Library aria-hidden className="size-4" />
        {t("open")}
      </Button>
      <Dialog className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <VideoList
          lesson={lesson}
          onUsed={() => {
            setOpen(false)
          }}
        />
      </Dialog>
    </DialogTrigger>
  )
}
