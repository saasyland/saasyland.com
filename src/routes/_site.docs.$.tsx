import { type JSX, Suspense } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

import { DOCS_CONTENT_ID } from "~/src/data/navigation.constants"

import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"
import { docsContent } from "~/src/presentation/components/custom/docs-content"
import { DocsPagePending } from "~/src/presentation/components/custom/docs-pending"

const DocumentationPage = () => {
  const { path } = Route.useLoaderData()
  const content = docsContent.useContent(path)

  return <Suspense key={path}>{content}</Suspense>
}

const DocumentationNotFound = (): JSX.Element => (
  <main className="[grid-area:main]" id={DOCS_CONTENT_ID}>
    <DefaultNotFound />
  </main>
)

export const Route = createFileRoute("/_site/docs/$")({
  component: DocumentationPage,
  loader: ({ params }) => loadDocsPage(params._splat),
  head: docsHead,
  notFoundComponent: DocumentationNotFound,
  pendingComponent: DocsPagePending,
})
