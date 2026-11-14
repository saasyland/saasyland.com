import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useTranslations } from "use-intl/react"

import { BYTES_PER_MEGABYTE, VIDEO_SIZE_FORMAT } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { formatClock } from "~/src/lib/duration"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { DeleteVideoButton } from "~/src/presentation/components/custom/admin/videos/delete-video-button"
import { VideoPreviewButton } from "~/src/presentation/components/custom/admin/videos/video-preview-button"
import { DataTableActionsHeader, type DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type VideoRow = Video["select"]

type VideoHeaderId = "captions" | "duration" | "published" | "resolution" | "size" | "title"

const VideoHeader = ({ id }: { readonly id: VideoHeaderId }): string => {
  const t = useTranslations("pages.admin.videos.table.headers")

  return t(id)
}

const TitleCell = ({ row }: CellContext<DataTableFeatures, VideoRow, string>): JSX.Element => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate text-sm font-medium text-foreground">{row.original.title}</span>
    <span className="truncate font-mono text-xs text-muted-foreground">{row.original.id}</span>
  </div>
)

const DurationCell = ({ getValue }: CellContext<DataTableFeatures, VideoRow, number>): JSX.Element => (
  <span className="font-mono text-sm text-muted-foreground tabular-nums">{formatClock(getValue())}</span>
)

const ResolutionCell = ({ row }: CellContext<DataTableFeatures, VideoRow, number>): JSX.Element => (
  <span className="font-mono text-sm text-muted-foreground tabular-nums">
    {row.original.width}×{row.original.height}
  </span>
)

const SizeCell = ({ getValue }: CellContext<DataTableFeatures, VideoRow, number>): JSX.Element => {
  const format = useFormatter()

  return (
    <span className="text-sm text-muted-foreground tabular-nums">{format.number(getValue() / BYTES_PER_MEGABYTE, VIDEO_SIZE_FORMAT)}</span>
  )
}

const CaptionsCell = ({ getValue }: CellContext<DataTableFeatures, VideoRow, VideoRow["captionLocales"]>): JSX.Element => {
  const t = useTranslations("pages.admin.videos.table")
  const locales = getValue()

  if (locales.length === 0) {
    return <span className="text-sm text-muted-foreground">{t("noCaptions")}</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {locales.map((locale) => (
        <Badge className="font-mono text-[10px]" key={locale} variant="outline">
          {locale}
        </Badge>
      ))}
    </div>
  )
}

const PublishedCell = ({ getValue }: CellContext<DataTableFeatures, VideoRow, Date>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-muted-foreground">{format.dateTime(getValue(), "date")}</span>
}

const ActionsCell = ({ row }: CellContext<DataTableFeatures, VideoRow>): JSX.Element => (
  <div className="flex justify-end gap-1">
    <VideoPreviewButton title={row.original.title} videoId={row.original.id} />
    <DeleteVideoButton title={row.original.title} videoId={row.original.id} />
  </div>
)

const columnHelper = createColumnHelper<DataTableFeatures, VideoRow>()

export const videoColumns = columnHelper.columns([
  columnHelper.accessor("title", { cell: TitleCell, enableSorting: false, header: () => <VideoHeader id="title" /> }),
  columnHelper.accessor("durationMs", { cell: DurationCell, enableSorting: false, header: () => <VideoHeader id="duration" /> }),
  columnHelper.accessor("height", { cell: ResolutionCell, enableSorting: false, header: () => <VideoHeader id="resolution" /> }),
  columnHelper.accessor("sizeBytes", { cell: SizeCell, enableSorting: false, header: () => <VideoHeader id="size" /> }),
  columnHelper.accessor("captionLocales", { cell: CaptionsCell, enableSorting: false, header: () => <VideoHeader id="captions" /> }),
  columnHelper.accessor("createdAt", { cell: PublishedCell, enableSorting: false, header: () => <VideoHeader id="published" /> }),
  columnHelper.display({ cell: ActionsCell, header: DataTableActionsHeader, id: "actions" }),
])
