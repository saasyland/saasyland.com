import type { JSX } from "react"

import { MoreHorizontal } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

export const RowActionsCell = (): JSX.Element => {
  const t = useTranslations("pages.admin.labels")

  return (
    <div className="flex justify-end">
      <Button
        aria-label={t("rowActions")}
        className="size-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
        size="icon"
        variant="ghost"
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </Button>
    </div>
  )
}
