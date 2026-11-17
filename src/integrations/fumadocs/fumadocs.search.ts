import { createFromSource } from "fumadocs-core/search/server"

import { source } from "~/src/integrations/fumadocs/fumadocs.source"

export const search = createFromSource(source, {
  buildIndex: async ({ data, locale, url }) => {
    const { structuredData } = await data.load()

    return { description: data.description ?? "", id: `${locale ?? ""}:${url}`, structuredData, title: data.title, url }
  },
})
