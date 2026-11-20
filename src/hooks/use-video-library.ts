import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getVideosPageQuery } from "~/src/modules/video/use-cases/get-videos"
import { VIDEO_LIBRARY_PAGE_SIZE } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { formatClock } from "~/src/lib/duration"

type LibraryVideo = Pick<Video["select"], "durationMs" | "placeholder" | "title">

export const useVideoLabel = (): ((video: LibraryVideo) => string) => {
  const t = useTranslations("pages.admin.courses.lesson")

  return (video) => {
    const label = `${video.title} · ${formatClock(video.durationMs)}`

    return video.placeholder ? `${label} · ${t("placeholder")}` : label
  }
}

export const useVideoLibrary = (enabled: boolean): Map<string, string> => {
  const label = useVideoLabel()

  const { data } = useQuery({ ...getVideosPageQuery({ pageSize: VIDEO_LIBRARY_PAGE_SIZE }), enabled })

  return new Map(data?.rows.map((video): [string, string] => [video.id, label(video)]))
}
