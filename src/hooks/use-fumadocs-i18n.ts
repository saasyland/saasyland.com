import { useMemo } from "react"

import type { Translations } from "@fumadocs/base-ui/i18n"
import type { RootProviderProps } from "@fumadocs/base-ui/provider/tanstack"
import { useTranslations } from "use-intl/react"
import zod from "zod/v4"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

const FUMADOCS_MESSAGES = {
  "Close Search(search dialog)(aria-label)": "search.close",
  "Close Sidebar(sidebar)(aria-label)": "sidebar.close",
  "Collapse Sidebar(sidebar)(aria-label)": "sidebar.collapse",
  "Copied Anchor Link(heading anchor)(aria-label)": "copy.linkCopied",
  "Copied Link(accordion)(aria-label)": "copy.linkCopied",
  "Copied Text(code block)(aria-label)": "copy.codeCopied",
  "Copy Anchor Link(heading anchor)(aria-label)": "copy.link",
  "Copy Link(accordion)(aria-label)": "copy.link",
  "Copy Text(code block)(aria-label)": "copy.code",
  "Next Page(pagination)": "pagination.next",
  "No results found(search dialog)": "search.noResults",
  "On this page(table of contents)": "tableOfContents",
  "Open Search(search trigger)(aria-label)": "search.open",
  "Open Sidebar(sidebar)(aria-label)": "sidebar.open",
  "Previous Page(pagination)": "pagination.previous",
  "Search failed(search dialog)": "search.failed",
  "Search failed, showing results for {query}(search dialog)": "search.failedWithResults",
  "Search(search dialog)": "search.label",
  "Search(search trigger)": "search.label",
  "Table of Contents(inline table of contents)": "tableOfContents",
} as const satisfies Partial<Record<keyof Translations, string>>

const SKIP_LINK = "Skip to Content(skip link)" satisfies keyof Translations

const messageSchema = zod.string()

const useSkipLinkLabel = (): string => {
  const t = useTranslations("components.custom.navigation")

  return t("skipToContent")
}

export const useFumadocsI18n = (): NonNullable<RootProviderProps["i18n"]> => {
  const locale = getCurrentLocale()
  const skipLink = useSkipLinkLabel()
  const t = useTranslations("fumadocs")

  return useMemo(
    () => ({
      locale,
      translations: {
        ...Object.fromEntries(Object.entries(FUMADOCS_MESSAGES).map(([text, key]) => [text, messageSchema.parse(t.raw(key))])),
        [SKIP_LINK]: skipLink,
      },
    }),
    [locale, skipLink, t],
  )
}
