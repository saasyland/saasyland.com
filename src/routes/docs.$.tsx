import { createFileRoute } from "@tanstack/react-router"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

const DocumentationPage = () => docsContent.useContent(Route.useLoaderData().path)

export const Route = createFileRoute("/docs/$")({
  component: DocumentationPage,
  head: docsHead,
  loader: ({ params }) => loadDocsPage(params._splat),
  pendingMs: Number.POSITIVE_INFINITY,
  wrapInSuspense: false,
})
