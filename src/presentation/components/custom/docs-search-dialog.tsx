import { type JSX, useMemo } from "react"

import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "@fumadocs/base-ui/components/dialog/search"
import type { SharedProps } from "@fumadocs/base-ui/contexts/search"
import { experimental_useSearch as useSearch } from "fumadocs-core/search/client"
import { SEARCH_INDEXES } from "virtual:docs-search"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

const searchIndex = (from: string) => async (query: string) => {
  const { staticClient } = await import("fumadocs-core/search/client/orama-static")

  return staticClient({ from }).search(query)
}

export const DocsSearchDialog = ({ dialogHandle, onOpenChange, open }: SharedProps): JSX.Element => {
  const from = SEARCH_INDEXES[getCurrentLocale()]
  const run = useMemo(() => searchIndex(from), [from])
  const search = useSearch(run)

  return (
    <SearchDialog {...search} dialogHandle={dialogHandle} onOpenChange={onOpenChange} open={open}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </SearchDialog>
  )
}
