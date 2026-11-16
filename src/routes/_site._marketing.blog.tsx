import { createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BlogPending } from "~/src/presentation/components/custom/blog/blog-pending"

import docsCss from "~/src/presentation/styles/docs.css?url"

const NAMESPACES = ["pages.blog"] as const

export const Route = createFileRoute("/_site/_marketing/blog")({
  head: () => ({ links: [{ href: docsCss, rel: "stylesheet" }] }),
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: BlogPending,
  staticData: { namespaces: NAMESPACES },
})
