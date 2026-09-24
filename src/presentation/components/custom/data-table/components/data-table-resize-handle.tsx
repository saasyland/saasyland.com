import type { JSX } from "react"

import type { Header, RowData } from "@tanstack/react-table"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table/features"

export const DataTableResizeHandle = <TData extends RowData>({
  header,
}: {
  readonly header: Header<DataTableFeatures, TData>
}): JSX.Element => {
  const t = useTranslations("components.custom.data-table")

  return (
    <button
      aria-label={t("resizeColumn")}
      className="group/resize absolute top-0 right-0 z-20 flex h-full w-2 cursor-col-resize touch-none items-stretch justify-end select-none"
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      tabIndex={-1}
      type="button"
    >
      <span
        aria-hidden
        className={cn(
          "w-0.5 rounded-full bg-transparent transition-colors group-hover/resize:bg-border",
          header.column.getIsResizing() && "bg-ring group-hover/resize:bg-ring",
        )}
      />
    </button>
  )
}
