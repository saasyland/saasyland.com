import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { setVideoPlaceholderMutation } from "~/src/modules/video/use-cases/set-video-placeholder"
import { VIDEO_QUERY_KEYS } from "~/src/modules/video/video.constants"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Switch } from "~/src/presentation/components/shadcn/switch"

interface VideoPlaceholderSwitchProps {
  readonly placeholder: boolean
  readonly title: string
  readonly videoId: string
}

export const VideoPlaceholderSwitch = ({ placeholder, title, videoId }: VideoPlaceholderSwitchProps): JSX.Element => {
  const t = useTranslations("pages.admin.videos.placeholder")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { isPending, mutate } = useMutation({
    ...setVideoPlaceholderMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async (row) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: VIDEO_QUERY_KEYS.ALL }),
        queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
      ])
      toast.success(t(row.placeholder ? "marked" : "cleared", { title }))
    },
  })

  return (
    <Switch
      aria-label={t("label", { title })}
      isDisabled={isPending}
      isSelected={placeholder}
      onChange={(isSelected) => {
        mutate({ placeholder: isSelected, videoId })
      }}
      size="sm"
    />
  )
}
