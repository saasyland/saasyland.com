import { type JSX, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, Link2, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { DropIndicator, GridList, GridListItem, useDragAndDrop } from "react-aria-components"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { FIRST_POSITION } from "~/src/modules/_core/constants/ordering"
import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { DROP_POSITION } from "~/src/modules/course/course.curriculum"
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
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { DropdownMenuItem, DropdownMenuSeparator } from "~/src/presentation/components/shadcn/dropdown-menu"

import { AttachmentTitleDialog } from "~/src/presentation/components/custom/admin/courses/attachment-title-dialog"
import { DragHandle } from "~/src/presentation/components/custom/admin/courses/drag-handle"
import { FileAttachmentDialog } from "~/src/presentation/components/custom/admin/courses/file-attachment-dialog"
import { LinkAttachmentDialog } from "~/src/presentation/components/custom/admin/courses/link-attachment-dialog"
import { RowMenu } from "~/src/presentation/components/custom/row-menu"

type Attachment = Course["editorAttachment"]

const ATTACHMENT_DIALOG = {
  DELETE: "delete",
  EDIT: "edit",
} as const

type AttachmentDialogKind = (typeof ATTACHMENT_DIALOG)[keyof typeof ATTACHMENT_DIALOG]

const TEXT_DRAG_TYPE = "text/plain"

const ROW_CLASSNAME =
  "border-b border-border outline-none last:border-b-0 data-allows-dragging:cursor-grab data-dragging:opacity-50 data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid"

interface MaterialOrder {
  readonly rows: readonly Attachment[]
  readonly source: readonly Attachment[]
}

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

const EditAttachment = ({
  attachment,
  isOpen,
  onOpenChange,
}: {
  readonly attachment: Attachment
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
}): JSX.Element => {
  if (attachment.kind === LESSON_ATTACHMENT_KIND.LINK) {
    return <LinkAttachmentDialog isOpen={isOpen} lessonId={attachment.lessonId} link={attachment} onOpenChange={onOpenChange} />
  }

  return <AttachmentTitleDialog attachment={attachment} isOpen={isOpen} onOpenChange={onOpenChange} />
}

const AttachmentRow = ({ attachment }: { readonly attachment: Attachment }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [dialog, setDialog] = useState<AttachmentDialogKind>()
  const title = localize(attachment.title, getCurrentLocale())
  const Icon = attachment.kind === LESSON_ATTACHMENT_KIND.LINK ? Link2 : FileText

  const remove = useMutation({
    ...deleteLessonAttachmentMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
  })

  const closeDialog = (): void => {
    setDialog(undefined)
  }

  return (
    <div className="grid grid-cols-[2rem_1rem_minmax(0,1fr)_2rem] items-center gap-x-2 py-2">
      <DragHandle />
      <Icon aria-hidden className="size-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 flex min-w-0 text-spec text-muted-foreground">
          <AttachmentDetail attachment={attachment} />
        </p>
      </div>
      <RowMenu label={t("menu", { title })}>
        <DropdownMenuItem
          onAction={() => {
            setDialog(ATTACHMENT_DIALOG.EDIT)
          }}
          textValue={t("edit")}
        >
          <Pencil aria-hidden />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onAction={() => {
            setDialog(ATTACHMENT_DIALOG.DELETE)
          }}
          variant="destructive"
          textValue={t("delete")}
        >
          <Trash2 aria-hidden />
          {t("delete")}
        </DropdownMenuItem>
      </RowMenu>
      <EditAttachment attachment={attachment} isOpen={dialog === ATTACHMENT_DIALOG.EDIT} onOpenChange={closeDialog} />
      <AlertDialog isOpen={dialog === ATTACHMENT_DIALOG.DELETE} onOpenChange={closeDialog}>
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
    </div>
  )
}

const MaterialList = ({ lesson }: { readonly lesson: Course["editorLesson"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [order, setOrder] = useState<MaterialOrder>()

  const save = useMutation({
    ...moveLessonAttachmentMutation,
    onError: (error) => {
      setOrder(undefined)
      toast.error(errorMessage(error))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
    scope: { id: lesson.id },
  })
  const isMoved = order !== undefined && (save.isPending || order.source === lesson.attachments)
  const attachments = isMoved ? order.rows : lesson.attachments

  const { dragAndDropHooks } = useDragAndDrop<Attachment>({
    getItems: (keys) =>
      attachments
        .filter((attachment) => keys.has(attachment.id))
        .map((attachment) => ({ [TEXT_DRAG_TYPE]: localize(attachment.title, getCurrentLocale()) })),
    onReorder: ({ keys, target }) => {
      const moved = attachments.filter((attachment) => keys.has(attachment.id))
      const rest = attachments.filter((attachment) => !keys.has(attachment.id))
      const index = rest.findIndex((attachment) => attachment.id === target.key) + (target.dropPosition === DROP_POSITION.AFTER ? 1 : 0)
      const rows = [...rest.slice(0, index), ...moved, ...rest.slice(index)]
      setOrder({ rows, source: lesson.attachments })
      for (const attachment of moved) {
        save.mutate({ attachmentId: attachment.id, position: rows.indexOf(attachment) + FIRST_POSITION })
      }
    },
    renderDropIndicator: (target) => (
      <DropIndicator className={({ isDropTarget }) => cn("h-0.5 rounded-full", { "bg-ring": isDropTarget })} target={target} />
    ),
  })

  return (
    <GridList aria-label={t("title")} disallowTypeAhead dragAndDropHooks={dragAndDropHooks} items={attachments}>
      {(attachment) => (
        <GridListItem className={ROW_CLASSNAME} id={attachment.id} textValue={localize(attachment.title, getCurrentLocale())}>
          <AttachmentRow attachment={attachment} />
        </GridListItem>
      )}
    </GridList>
  )
}

export const LessonMaterials = ({ lesson }: { readonly lesson: Course["editorLesson"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const [isAddingLink, setAddingLink] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        {lesson.attachments.length > 1 && <CardDescription>{t("reorderHint")}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {lesson.attachments.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {lesson.attachments.length > 0 && <MaterialList lesson={lesson} />}
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
          <Button
            onPress={() => {
              setAddingLink(true)
            }}
            size="sm"
            variant="outline"
          >
            <Plus aria-hidden className="size-4" />
            {t("addLink")}
          </Button>
          <LinkAttachmentDialog isOpen={isAddingLink} lessonId={lesson.id} onOpenChange={setAddingLink} />
        </div>
      </CardContent>
    </Card>
  )
}
