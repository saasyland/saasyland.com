import { Suspense } from "react"

import { createFileRoute } from "@tanstack/react-router"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

const DocumentationPage = () => {
  const { path } = Route.useLoaderData()
  const content = docsContent.useContent(path)

  return <Suspense key={path}>{content}</Suspense>
}

export const Route = createFileRoute("/docs/$")({
  component: DocumentationPage,
  head: docsHead,
  loader: ({ params }) => loadDocsPage(params._splat),
  pendingMs: Number.POSITIVE_INFINITY,
  wrapInSuspense: false,
})
