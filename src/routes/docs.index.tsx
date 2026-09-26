import { createFileRoute } from "@tanstack/react-router"

import { docsHead, loadDocsPage } from "~/src/integrations/fumadocs/fumadocs.docs"

import { docsContent } from "~/src/presentation/components/custom/docs-content"

const DocumentationIndexPage = () => docsContent.useContent(Route.useLoaderData().path)

export const Route = createFileRoute("/docs/")({
  component: DocumentationIndexPage,
  head: docsHead,
  loader: () => loadDocsPage(),
  pendingMs: Number.POSITIVE_INFINITY,
})
