import { InlineTOC } from "@fumadocs/base-ui/components/inline-toc"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "@fumadocs/base-ui/layouts/docs/page"
import browserCollections from "collections/browser"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

const TABLE_OF_CONTENTS = { container: { "aria-labelledby": "toc-title", role: "navigation" } }
const TABLE_OF_CONTENTS_POPOVER = { enabled: false }

export const docsContent = browserCollections.docs.createClientLoader({
  component: ({ default: Mdx, frontmatter, toc }) => (
    <DocsPage tableOfContent={TABLE_OF_CONTENTS} tableOfContentPopover={TABLE_OF_CONTENTS_POPOVER} toc={toc}>
      <DocsTitle>{frontmatter.title}</DocsTitle>
      <DocsDescription>{frontmatter.description}</DocsDescription>
      {toc.length > 0 && <InlineTOC className="xl:hidden" items={toc} />}
      <DocsBody>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  ),
  id: "docs",
})
