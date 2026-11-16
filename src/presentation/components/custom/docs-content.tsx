import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "@fumadocs/base-ui/layouts/docs/page"
import browserCollections from "collections/browser"

import { SITE_CONTENT_ID } from "~/src/data/navigation.constants"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

const TABLE_OF_CONTENTS = { container: { "aria-labelledby": "toc-title", role: "navigation" } }

export const docsContent = browserCollections.docs.createClientLoader({
  component: ({ default: Mdx, frontmatter, toc }) => (
    <DocsPage id={SITE_CONTENT_ID} tableOfContent={TABLE_OF_CONTENTS} toc={toc}>
      <DocsTitle>{frontmatter.title}</DocsTitle>
      <DocsDescription>{frontmatter.description}</DocsDescription>
      <DocsBody>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  ),
  id: "docs",
})
