import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { deleteVideoMutation } from "~/src/modules/video/use-cases/delete-video"
import { VIDEO_QUERY_KEYS } from "~/src/modules/video/video.constants"

import { useErrorMessage } from "~/src/hooks/use-error-message"

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

export const DeleteVideoButton = ({ title, videoId }: { readonly title: string; readonly videoId: string }): JSX.Element => {
  const t = useTranslations("pages.admin.videos")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { isPending, mutate } = useMutation({
    ...deleteVideoMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: VIDEO_QUERY_KEYS.ALL })
      toast.success(t("delete.success", { title }))
    },
  })

  return (
    <AlertDialogTrigger>
      <Button
        aria-label={t("actions.delete", { title })}
        className="size-8 text-muted-foreground hover:text-destructive"
        isDisabled={isPending}
        size="icon"
        variant="ghost"
      >
        <Trash2 aria-hidden className="size-4" />
      </Button>
      <AlertDialog>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("delete.body", { title })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("delete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onPress={() => {
              mutate({ videoId })
            }}
            variant="destructive"
          >
            {t("delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </AlertDialogTrigger>
  )
}
