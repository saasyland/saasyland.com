import { Suspense } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

import { docsContent } from "~/src/presentation/components/custom/docs-content"
import { DocsIndexPending } from "~/src/presentation/components/custom/docs-pending"

const DocumentationIndexPage = () => {
  const { path } = Route.useLoaderData()
  const content = docsContent.useContent(path)

  return <Suspense key={path}>{content}</Suspense>
}

export const Route = createFileRoute("/_site/docs/")({
  component: DocumentationIndexPage,
  head: docsHead,
  loader: () => loadDocsPage(),
  pendingComponent: DocsIndexPending,
})
