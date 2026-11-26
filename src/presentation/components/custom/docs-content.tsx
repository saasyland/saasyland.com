import { InlineTOC } from "@fumadocs/base-ui/components/inline-toc"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "@fumadocs/base-ui/layouts/docs/page"
import { TOCPopover, TOCProvider } from "@fumadocs/base-ui/layouts/docs/page/slots/toc"
import browserCollections from "collections/browser"

import { DocsToc } from "~/src/presentation/components/custom/docs-toc"
import { mdxComponents } from "~/src/presentation/components/custom/mdx"

const SLOTS = { toc: { main: DocsToc, popover: TOCPopover, provider: TOCProvider } }
const TABLE_OF_CONTENTS_POPOVER = { enabled: false }

export const docsContent = browserCollections.docs.createClientLoader({
  component: ({ default: Mdx, frontmatter, toc }) => (
    <>
      <div className="hidden" id="nd-toc-column" />
      <DocsPage slots={SLOTS} tableOfContent={{ enabled: toc.length > 0 }} tableOfContentPopover={TABLE_OF_CONTENTS_POPOVER} toc={toc}>
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        {toc.length > 0 && <InlineTOC className="xl:hidden" items={toc} />}
        <DocsBody>
          <Mdx components={mdxComponents} />
        </DocsBody>
      </DocsPage>
    </>
  ),
  id: "docs",
})
