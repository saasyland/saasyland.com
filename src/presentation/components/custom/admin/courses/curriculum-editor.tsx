import type { JSX } from "react"

import { type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { deleteChapterMutation } from "~/src/modules/chapter/use-cases/delete-chapter"
import { moveChapterMutation } from "~/src/modules/chapter/use-cases/move-chapter"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { deleteLessonMutation } from "~/src/modules/lesson/use-cases/delete-lesson"
import { moveLessonMutation } from "~/src/modules/lesson/use-cases/move-lesson"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"

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
  AlertDialogTrigger,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { ChapterDialog } from "~/src/presentation/components/custom/admin/courses/chapter-dialog"
import { LessonDialog } from "~/src/presentation/components/custom/admin/courses/lesson-dialog"
import { MoveButtons } from "~/src/presentation/components/custom/admin/courses/move-buttons"

const ICON_BUTTON_CLASSNAME = "size-8 text-muted-foreground"
const LESSON_NUMBER_BASE = 1

type EditorChapter = Course["editor"]["chapters"][number]
type EditorLesson = EditorChapter["lessons"][number]

const useCurriculumMutation = <TData, TVariables>(options: UseMutationOptions<TData, Error, TVariables>) => {
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  return useMutation({
    ...options,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
  })
}

interface ConfirmDeleteProps {
  readonly body: string
  readonly label: string
  readonly onConfirm: () => void
  readonly title: string
}

const ConfirmDelete = ({ body, label, onConfirm, title }: ConfirmDeleteProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.curriculum")

  return (
    <AlertDialogTrigger>
      <Button aria-label={label} className={cn(ICON_BUTTON_CLASSNAME, "hover:text-destructive")} size="icon" variant="ghost">
        <Trash2 aria-hidden className="size-4" />
      </Button>
      <AlertDialog>
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
    </AlertDialogTrigger>
  )
}

const LessonRow = ({
  chapter,
  index,
  lesson,
}: {
  readonly chapter: EditorChapter
  readonly index: number
  readonly lesson: EditorLesson
}) => {
  const t = useTranslations("pages.admin.courses")
  const title = localize(lesson.title, getCurrentLocale())

  const move = useCurriculumMutation(moveLessonMutation)
  const remove = useCurriculumMutation(deleteLessonMutation)

  return (
    <li className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center">
      <span aria-hidden className="w-6 font-mono text-xs text-muted-foreground tabular-nums">
        {index + LESSON_NUMBER_BASE}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{lesson.slug}</span>
          <span aria-hidden>·</span>
          <span>{lesson.video === null ? t("curriculum.noVideo") : `${lesson.video.title} · ${formatClock(lesson.video.durationMs)}`}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="text-[10px]" variant="outline">
          {t(`lesson.accessLevels.${lesson.access}`)}
        </Badge>
        <Badge
          className={cn("text-[10px]", {
            [ADMIN_STATUS_BADGE_CLASSES.emerald]: lesson.status === LESSON_STATUS.PUBLISHED,
            [ADMIN_STATUS_BADGE_CLASSES.neutral]: lesson.status === LESSON_STATUS.DRAFT,
          })}
          variant="outline"
        >
          {t(`lesson.statuses.${lesson.status}`)}
        </Badge>
        <MoveButtons
          isFirst={index === 0}
          isLast={index === chapter.lessons.length - LESSON_NUMBER_BASE}
          name={title}
          onMove={(direction) => {
            move.mutate({ direction, lessonId: lesson.id })
          }}
        />
        <LessonDialog
          chapterId={chapter.id}
          lesson={lesson}
          trigger={
            <Button aria-label={t("curriculum.edit", { name: title })} className={ICON_BUTTON_CLASSNAME} size="icon" variant="ghost">
              <Pencil aria-hidden className="size-4" />
            </Button>
          }
        />
        <ConfirmDelete
          body={t("curriculum.deleteLessonBody", { name: title })}
          label={t("curriculum.remove", { name: title })}
          onConfirm={() => {
            remove.mutate({ lessonId: lesson.id })
          }}
          title={t("curriculum.deleteLessonTitle")}
        />
      </div>
    </li>
  )
}

const ChapterSection = ({
  chapter,
  courseId,
  index,
  total,
}: {
  readonly chapter: EditorChapter
  readonly courseId: string
  readonly index: number
  readonly total: number
}) => {
  const t = useTranslations("pages.admin.courses.curriculum")
  const title = localize(chapter.title, getCurrentLocale())

  const move = useCurriculumMutation(moveChapterMutation)
  const remove = useCurriculumMutation(deleteChapterMutation)

  return (
    <li className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-1">
          <MoveButtons
            isFirst={index === 0}
            isLast={index === total - LESSON_NUMBER_BASE}
            name={title}
            onMove={(direction) => {
              move.mutate({ chapterId: chapter.id, direction })
            }}
          />
          <ChapterDialog
            chapter={chapter}
            courseId={courseId}
            trigger={
              <Button aria-label={t("edit", { name: title })} className={ICON_BUTTON_CLASSNAME} size="icon" variant="ghost">
                <Pencil aria-hidden className="size-4" />
              </Button>
            }
          />
          <ConfirmDelete
            body={t("deleteChapterBody", { name: title })}
            label={t("remove", { name: title })}
            onConfirm={() => {
              remove.mutate({ chapterId: chapter.id })
            }}
            title={t("deleteChapterTitle")}
          />
        </div>
      </div>
      <div className="px-4">
        {chapter.lessons.length === 0 && <p className="py-4 text-sm text-muted-foreground">{t("noLessons")}</p>}
        {chapter.lessons.length > 0 && (
          <ol>
            {chapter.lessons.map((lesson, lessonIndex) => (
              <LessonRow chapter={chapter} index={lessonIndex} key={lesson.id} lesson={lesson} />
            ))}
          </ol>
        )}
        <div className="py-3">
          <LessonDialog
            chapterId={chapter.id}
            trigger={
              <Button size="sm" variant="outline">
                <Plus aria-hidden className="size-4" />
                {t("addLesson")}
              </Button>
            }
          />
        </div>
      </div>
    </li>
  )
}

export const CurriculumEditor = ({ editor }: { readonly editor: Course["editor"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.curriculum")

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <ChapterDialog
          courseId={editor.course.id}
          trigger={
            <Button size="sm">
              <Plus aria-hidden className="size-4" />
              {t("addChapter")}
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {editor.chapters.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {editor.chapters.length > 0 && (
          <ol className="flex flex-col gap-4">
            {editor.chapters.map((chapter, index) => (
              <ChapterSection chapter={chapter} courseId={editor.course.id} index={index} key={chapter.id} total={editor.chapters.length} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
