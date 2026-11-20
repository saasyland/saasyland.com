import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, Link2, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { deleteLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/delete-lesson-attachment"
import { moveLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/move-lesson-attachment"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFileSize } from "~/src/hooks/use-file-size"

import { cn } from "~/src/lib/cn"

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
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { AttachmentTitleDialog } from "~/src/presentation/components/custom/admin/courses/attachment-title-dialog"
import { FileAttachmentDialog } from "~/src/presentation/components/custom/admin/courses/file-attachment-dialog"
import { LinkAttachmentDialog } from "~/src/presentation/components/custom/admin/courses/link-attachment-dialog"
import { MoveButtons } from "~/src/presentation/components/custom/admin/courses/move-buttons"

const ICON_BUTTON_CLASSNAME = "size-8 text-muted-foreground"

type Attachment = Course["editorAttachment"]

const AttachmentDetail = ({ attachment }: { readonly attachment: Attachment }): JSX.Element => {
  const fileSize = useFileSize()

  if (attachment.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return <span className="truncate font-mono">{attachment.url}</span>
  }

  return (
    <span className="truncate font-mono">
      {attachment.fileName} · {fileSize(attachment.sizeBytes)}
    </span>
  )
}

const EditAttachment = ({ attachment, title }: { readonly attachment: Attachment; readonly title: string }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const trigger = (
    <Button aria-label={t("edit", { title })} className={ICON_BUTTON_CLASSNAME} size="icon" variant="ghost">
      <Pencil aria-hidden className="size-4" />
    </Button>
  )

  if (attachment.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return <LinkAttachmentDialog lessonId={attachment.lessonId} link={attachment} trigger={trigger} />
  }

  return <AttachmentTitleDialog attachment={attachment} trigger={trigger} />
}

const AttachmentRow = ({
  attachment,
  index,
  total,
}: {
  readonly attachment: Attachment
  readonly index: number
  readonly total: number
}): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const title = localize(attachment.title, getCurrentLocale())
  const Icon = attachment.kind === LESSON_ATTACHMENT_KIND.LINK ? Link2 : FileText

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
  const move = useMutation({ ...moveLessonAttachmentMutation, onError, onSuccess })
  const remove = useMutation({ ...deleteLessonAttachmentMutation, onError, onSuccess })

  return (
    <li className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 flex min-w-0 text-xs text-muted-foreground">
          <AttachmentDetail attachment={attachment} />
        </p>
      </div>
      <div className="flex items-center gap-1">
        <MoveButtons
          isFirst={index === 0}
          isLast={index === total - 1}
          name={title}
          onMove={(direction) => {
            move.mutate({ attachmentId: attachment.id, direction })
          }}
        />
        <EditAttachment attachment={attachment} title={title} />
        <AlertDialogTrigger>
          <Button
            aria-label={t("remove", { title })}
            className={cn(ICON_BUTTON_CLASSNAME, "hover:text-destructive")}
            size="icon"
            variant="ghost"
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
          <AlertDialog>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("deleteBody", { title })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onPress={() => {
                  remove.mutate({ attachmentId: attachment.id })
                }}
                variant="destructive"
              >
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialog>
        </AlertDialogTrigger>
      </div>
    </li>
  )
}

export const LessonMaterials = ({ lesson }: { readonly lesson: Course["editorLesson"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {lesson.attachments.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {lesson.attachments.length > 0 && (
          <ol>
            {lesson.attachments.map((attachment, index) => (
              <AttachmentRow attachment={attachment} index={index} key={attachment.id} total={lesson.attachments.length} />
            ))}
          </ol>
        )}
        <div className="flex flex-wrap gap-2">
          <FileAttachmentDialog
            lessonId={lesson.id}
            trigger={
              <Button size="sm" variant="outline">
                <Upload aria-hidden className="size-4" />
                {t("uploadFile")}
              </Button>
            }
          />
          <LinkAttachmentDialog
            lessonId={lesson.id}
            trigger={
              <Button size="sm" variant="outline">
                <Plus aria-hidden className="size-4" />
                {t("addLink")}
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
