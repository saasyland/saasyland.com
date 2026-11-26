import { type JSX, useState } from "react"

import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { type DragTypes, DropIndicator, type DropTarget, GridList, GridListItem, useDragAndDrop } from "react-aria-components"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { deleteChapterMutation } from "~/src/modules/chapter/use-cases/delete-chapter"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import {
  CURRICULUM_DRAG_TYPES,
  CURRICULUM_ROW,
  type CurriculumRow,
  canDropInCurriculum,
  curriculumOrder,
  curriculumOrdersMatch,
  curriculumRows,
  moveInCurriculum,
} from "~/src/modules/course/course.curriculum"
import type { Course } from "~/src/modules/course/course.types"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import { reorderCurriculumMutation } from "~/src/modules/course/use-cases/reorder-curriculum"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { deleteLessonMutation } from "~/src/modules/lesson/use-cases/delete-lesson"
import { VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useErrorMessage } from "~/src/hooks/use-error-message"
import { LOCAL_UPLOAD_PHASE, useVideoUpload } from "~/src/hooks/use-video-upload"

import { LESSON_ACCESS_BADGES, LESSON_STATUS_BADGES } from "~/src/data/course-badges"

import { cn } from "~/src/lib/cn"
import { formatClock } from "~/src/lib/duration"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { DropdownMenuItem, DropdownMenuSeparator } from "~/src/presentation/components/shadcn/dropdown-menu"

import { ChapterDialog } from "~/src/presentation/components/custom/admin/courses/chapter-dialog"
import { DragHandle } from "~/src/presentation/components/custom/admin/courses/drag-handle"
import { LessonDialog } from "~/src/presentation/components/custom/admin/courses/lesson-dialog"
import { RowMenu } from "~/src/presentation/components/custom/row-menu"

import { ROUTES } from "~/src/routes"

const ROW_CLASSNAME =
  "outline-none data-allows-dragging:cursor-grab data-dragging:opacity-50 data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid"

type EditorChapter = Course["editorChapter"]
type EditorLesson = Course["editorLesson"]

const CHAPTER_DIALOG = {
  DELETE: "delete",
  EDIT: "edit",
} as const

type ChapterDialogKind = (typeof CHAPTER_DIALOG)[keyof typeof CHAPTER_DIALOG]

const DROP_MOVE = "move"
const DROP_CANCEL = "cancel"
const TEXT_DRAG_TYPE = "text/plain"

const useCurriculumMutation = <TData, TVariables>(options: UseMutationOptions<TData, Error, TVariables>) => {
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  return useMutation({
    ...options,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
  })
}

const useCurriculumOrder = (editor: Course["editor"]) => {
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const { queryKey } = courseEditorQuery({ courseId: editor.course.id })

  const save = useMutation({
    ...reorderCurriculumMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
    scope: { id: queryKey.join(" ") },
  })

  return (chapters: EditorChapter[]): void => {
    if (curriculumOrdersMatch(chapters, editor.chapters)) {
      return
    }

    const previous = queryClient.getQueryData(queryKey)
    void queryClient.cancelQueries({ queryKey })
    queryClient.setQueryData(queryKey, { ...editor, chapters })
    save.mutate(
      { chapters: curriculumOrder(chapters), courseId: editor.course.id },
      {
        onError: () => {
          queryClient.setQueryData(queryKey, previous)
        },
      },
    )
  }
}

const rowTitle = (row: CurriculumRow): string =>
  localize(row.kind === CURRICULUM_ROW.CHAPTER ? row.chapter.title : row.lesson.title, getCurrentLocale())

const draggedKind = (types: DragTypes) =>
  types.has(CURRICULUM_DRAG_TYPES[CURRICULUM_ROW.CHAPTER]) ? CURRICULUM_ROW.CHAPTER : CURRICULUM_ROW.LESSON

interface ConfirmDeleteProps {
  readonly body: string
  readonly isOpen: boolean
  readonly onConfirm: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly title: string
}

const ConfirmDelete = ({ body, isOpen, onConfirm, onOpenChange, title }: ConfirmDeleteProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.curriculum")

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{body}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
        <AlertDialogAction onPress={onConfirm} variant="destructive">
          {t("delete")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialog>
  )
}

const UPLOAD_BADGES = {
  [VIDEO_UPLOAD_STATUS.ENCODING]: "neutral",
  [VIDEO_UPLOAD_STATUS.FAILED]: "destructive",
  [VIDEO_UPLOAD_STATUS.QUEUED]: "warning",
  [VIDEO_UPLOAD_STATUS.UPLOADING]: "warning",
} as const

const LessonVideoBadge = ({ lesson }: { readonly lesson: EditorLesson }): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.courses.curriculum.video")

  const { upload } = useVideoUpload(lesson.id)

  if (lesson.format === LESSON_FORMAT.TEXT) {
    return <Badge variant="neutral">{t("text")}</Badge>
  }

  if (upload?.phase === LOCAL_UPLOAD_PHASE.UPLOADING) {
    return <Badge variant="neutral">{t("uploading", { percent: upload.uploadedBytes / upload.file.size })}</Badge>
  }

  if (upload !== undefined) {
    return <Badge variant="warning">{t("status.uploading")}</Badge>
  }

  if (lesson.upload !== undefined) {
    return <Badge variant={UPLOAD_BADGES[lesson.upload.status]}>{t(`status.${lesson.upload.status}`)}</Badge>
  }

  if (lesson.video !== null) {
    return
  }

  return <Badge variant="warning">{t("none")}</Badge>
}

interface LessonRowProps {
  readonly courseId: string
  readonly lesson: EditorLesson
  readonly number: number
}

const LessonRow = ({ courseId, lesson, number }: LessonRowProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses")
  const title = localize(lesson.title, getCurrentLocale())

  const [isDeleting, setDeleting] = useState(false)

  const { holders } = useCourseAccessNames()
  const remove = useCurriculumMutation(deleteLessonMutation)

  return (
    <div className="ml-4 grid grid-cols-[2rem_1.5rem_minmax(0,1fr)] items-baseline gap-x-2 gap-y-2 border-b border-l border-border py-3 pr-1 pl-2 sm:ml-6">
      <DragHandle />
      <span aria-hidden className="text-spec text-muted-foreground tabular-nums">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-pretty text-foreground">{title}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-spec text-muted-foreground">
          <span className="font-mono wrap-anywhere">{lesson.slug}</span>
          {lesson.format === LESSON_FORMAT.VIDEO && lesson.video !== null && (
            <>
              <span aria-hidden>·</span>
              <span className="min-w-0 wrap-anywhere tabular-nums">
                {lesson.video.title} · {formatClock(lesson.video.durationMs)}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="col-start-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <LessonVideoBadge lesson={lesson} />
          <Badge variant={LESSON_ACCESS_BADGES[lesson.access]}>{t(`lesson.accessLevels.${lesson.access}`, { holders })}</Badge>
          <Badge variant={LESSON_STATUS_BADGES[lesson.status]}>{t(`lesson.statuses.${lesson.status}`)}</Badge>
        </div>
        <div className="ml-auto flex items-center">
          <RowMenu label={t("curriculum.menu", { name: title })}>
            <DropdownMenuItem href={`${ROUTES.ADMIN.COURSES.INDEX}/${courseId}/lessons/${lesson.id}`} textValue={t("curriculum.edit")}>
              <Pencil aria-hidden />
              {t("curriculum.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onAction={() => {
                setDeleting(true)
              }}
              variant="destructive"
              textValue={t("curriculum.delete")}
            >
              <Trash2 aria-hidden />
              {t("curriculum.delete")}
            </DropdownMenuItem>
          </RowMenu>
          <ConfirmDelete
            body={t("curriculum.deleteLessonBody", { name: title })}
            isOpen={isDeleting}
            onConfirm={() => {
              remove.mutate({ lessonId: lesson.id })
            }}
            onOpenChange={setDeleting}
            title={t("curriculum.deleteLessonTitle")}
          />
        </div>
      </div>
    </div>
  )
}

interface ChapterRowProps {
  readonly chapter: EditorChapter
  readonly courseId: string
  readonly isFirst: boolean
}

const ChapterRow = ({ chapter, courseId, isFirst }: ChapterRowProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.curriculum")
  const title = localize(chapter.title, getCurrentLocale())
  const summary = localize(chapter.summary, getCurrentLocale())
  const [dialog, setDialog] = useState<ChapterDialogKind>()

  const remove = useCurriculumMutation(deleteChapterMutation)

  const closeDialog = (): void => {
    setDialog(undefined)
  }

  return (
    <div
      className={cn(
        "grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-2 gap-y-2 rounded-lg border border-border bg-muted/40 py-2.5 pr-1 pl-2",
        {
          "mt-4": !isFirst,
        },
      )}
    >
      <DragHandle />
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-48 pt-1">
          <h3 className="text-sm font-semibold text-pretty text-foreground">{title}</h3>
          {summary.length > 0 && <p className="mt-0.5 text-spec text-pretty text-muted-foreground">{summary}</p>}
          {chapter.lessons.length === 0 && <p className="mt-0.5 text-spec text-pretty text-muted-foreground">{t("noLessons")}</p>}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <LessonDialog
            chapterId={chapter.id}
            trigger={
              <Button aria-label={t("addLessonTo", { name: title })} className="h-8 text-muted-foreground" size="sm" variant="ghost">
                <Plus aria-hidden className="size-4" />
                <span className="max-sm:sr-only">{t("addLesson")}</span>
              </Button>
            }
          />
          <RowMenu label={t("menu", { name: title })}>
            <DropdownMenuItem
              onAction={() => {
                setDialog(CHAPTER_DIALOG.EDIT)
              }}
              textValue={t("edit")}
            >
              <Pencil aria-hidden />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onAction={() => {
                setDialog(CHAPTER_DIALOG.DELETE)
              }}
              variant="destructive"
              textValue={t("delete")}
            >
              <Trash2 aria-hidden />
              {t("delete")}
            </DropdownMenuItem>
          </RowMenu>
          <ChapterDialog chapter={chapter} courseId={courseId} isOpen={dialog === CHAPTER_DIALOG.EDIT} onOpenChange={closeDialog} />
          <ConfirmDelete
            body={t("deleteChapterBody", { name: title })}
            isOpen={dialog === CHAPTER_DIALOG.DELETE}
            onConfirm={() => {
              remove.mutate({ chapterId: chapter.id })
            }}
            onOpenChange={closeDialog}
            title={t("deleteChapterTitle")}
          />
        </div>
      </div>
    </div>
  )
}

interface CurriculumItemProps {
  readonly courseId: string
  readonly isFirst: boolean
  readonly row: CurriculumRow
}

const CurriculumItem = ({ courseId, isFirst, row }: CurriculumItemProps): JSX.Element => {
  if (row.kind === CURRICULUM_ROW.CHAPTER) {
    return (
      <GridListItem className={ROW_CLASSNAME} id={row.id} textValue={rowTitle(row)}>
        <ChapterRow chapter={row.chapter} courseId={courseId} isFirst={isFirst} />
      </GridListItem>
    )
  }

  return (
    <GridListItem className={ROW_CLASSNAME} id={row.id} textValue={rowTitle(row)}>
      <LessonRow courseId={courseId} lesson={row.lesson} number={row.number} />
    </GridListItem>
  )
}

const CurriculumList = ({ editor }: { readonly editor: Course["editor"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.curriculum")
  const rows = curriculumRows(editor.chapters)

  const reorder = useCurriculumOrder(editor)

  const { dragAndDropHooks } = useDragAndDrop<CurriculumRow>({
    getDropOperation: (target: DropTarget, types: DragTypes) =>
      canDropInCurriculum(rows, draggedKind(types), target) ? DROP_MOVE : DROP_CANCEL,
    getItems: (keys) =>
      rows.filter((row) => keys.has(row.id)).map((row) => ({ [CURRICULUM_DRAG_TYPES[row.kind]]: row.id, [TEXT_DRAG_TYPE]: rowTitle(row) })),
    onReorder: ({ keys, target }) => {
      const [moved] = keys
      reorder(
        moveInCurriculum(editor.chapters, { drop: { dropPosition: target.dropPosition, id: String(target.key) }, moved: String(moved) }),
      )
    },
    renderDropIndicator: (target) => (
      <DropIndicator className={({ isDropTarget }) => cn("h-0.5 rounded-full", { "bg-ring": isDropTarget })} target={target} />
    ),
  })

  return (
    <GridList aria-label={t("title")} disallowTypeAhead dragAndDropHooks={dragAndDropHooks} items={rows}>
      {(row) => <CurriculumItem courseId={editor.course.id} isFirst={rows.indexOf(row) === 0} row={row} />}
    </GridList>
  )
}

export const CurriculumEditor = ({ editor }: { readonly editor: Course["editor"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.curriculum")
  const [isAdding, setAdding] = useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
          <CardTitle>
            <h2>{t("title")}</h2>
          </CardTitle>
          {editor.chapters.length > 0 && <CardDescription>{t("reorderHint")}</CardDescription>}
        </div>
        <Button
          onPress={() => {
            setAdding(true)
          }}
          size="sm"
        >
          <Plus aria-hidden className="size-4" />
          {t("addChapter")}
        </Button>
        <ChapterDialog courseId={editor.course.id} isOpen={isAdding} onOpenChange={setAdding} />
      </CardHeader>
      <CardContent>
        {editor.chapters.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {editor.chapters.length > 0 && <CurriculumList editor={editor} />}
      </CardContent>
    </Card>
  )
}
