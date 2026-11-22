import type { JSX } from "react"

import { useTOCItems } from "@fumadocs/base-ui/components/toc"
import { Text } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { TableOfContents } from "~/src/presentation/components/custom/table-of-contents"

export const DocsToc = (): JSX.Element => {
  const items = useTOCItems()
  const t = useTranslations("fumadocs")

  if (items.length === 0) {
    return <div className="hidden" id="nd-toc-placeholder" />
  }

  return (
    <nav
      aria-labelledby="toc-title"
      className="sticky top-(--fd-docs-row-1) flex h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] w-(--fd-toc-width) flex-col pe-4 pt-12 pb-2 [grid-area:toc] max-xl:hidden"
      id="nd-toc"
    >
      <h3 className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground" id="toc-title">
        <Text aria-hidden className="size-4" />
        {t("tableOfContents")}
      </h3>
      <TableOfContents className="mt-3 min-h-0 flex-1" items={items} />
    </nav>
  )
}
