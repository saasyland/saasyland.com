import { Suspense } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

const DocumentationIndexPage = () => {
  const { path } = Route.useLoaderData()
  const content = docsContent.useContent(path)

  return <Suspense key={path}>{content}</Suspense>
}

export const Route = createFileRoute("/docs/")({
  component: DocumentationIndexPage,
  head: docsHead,
  loader: () => loadDocsPage(),
  pendingMs: Number.POSITIVE_INFINITY,
  wrapInSuspense: false,
})
