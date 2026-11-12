import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "@fumadocs/base-ui/layouts/docs/page"
import browserCollections from "collections/browser"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

export const docsContent = browserCollections.docs.createClientLoader({
  component: ({ default: Mdx, frontmatter, toc }) => (
    <DocsPage toc={toc}>
      <DocsTitle>{frontmatter.title}</DocsTitle>
      <DocsDescription>{frontmatter.description}</DocsDescription>
      <DocsBody>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  ),
  id: "docs",
})
