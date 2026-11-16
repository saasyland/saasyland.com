import type { JSX } from "react"

import { buttonVariants } from "@fumadocs/base-ui/components/ui/button"
import { useTreePath } from "@fumadocs/base-ui/contexts/tree"
import { SidebarTrigger } from "@fumadocs/base-ui/layouts/docs/slots/sidebar"
import { SearchTrigger } from "@fumadocs/base-ui/layouts/shared/slots/search-trigger"
import { PanelLeft } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

const BUTTON_SIZE = "size-11"
const CURRENT_PAGE_INDEX = -1

export const DocsToolbar = (): JSX.Element => {
  const t = useTranslations("navigation.content")
  const page = useTreePath().at(CURRENT_PAGE_INDEX)

  return (
    <nav aria-label={t("header.docs")} className="contents">
      <header className="sticky top-(--fd-docs-row-1) z-30 flex h-(--fd-header-height) items-center gap-1 border-b bg-fd-background/80 px-1 backdrop-blur-sm [grid-area:header] md:hidden">
        <SidebarTrigger className={cn(buttonVariants({ size: "icon", variant: "ghost" }), BUTTON_SIZE)}>
          <PanelLeft aria-hidden strokeWidth={1.5} />
        </SidebarTrigger>
        <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium">{page?.name ?? t("header.docs")}</p>
        <SearchTrigger className={BUTTON_SIZE} size="icon" />
      </header>
    </nav>
  )
}
