import { createFromSource } from "fumadocs-core/search/server"

import { source } from "~/src/integrations/fumadocs/fumadocs.source"

export const search = createFromSource(source, {
  buildIndex: ({ data, locale, url }) => ({
    description: data.description ?? "",
    id: `${locale ?? ""}:${url}`,
    structuredData: data.structuredData,
    title: data.title,
    url,
  }),
})
