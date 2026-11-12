import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "@fumadocs/base-ui/layouts/docs/page"
import browserCollections from "collections/browser"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

const TABLE_OF_CONTENTS = { container: { "aria-labelledby": "toc-title", role: "navigation" } }

export const docsContent = browserCollections.docs.createClientLoader({
  component: ({ default: Mdx, frontmatter, toc }) => (
    <DocsPage tableOfContent={TABLE_OF_CONTENTS} toc={toc}>
      <DocsTitle>{frontmatter.title}</DocsTitle>
      <DocsDescription>{frontmatter.description}</DocsDescription>
      <DocsBody>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  ),
  id: "docs",
})
