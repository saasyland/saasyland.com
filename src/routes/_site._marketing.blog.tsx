import { createFileRoute } from "@tanstack/react-router"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { blogFeedLinks } from "~/src/lib/feed"

import { BlogPending } from "~/src/presentation/components/custom/blog/blog-pending"

import docsCss from "~/src/presentation/styles/docs.css?url"

const BLOG_NAMESPACE = "pages.blog"
const NAMESPACES = ["fumadocs", BLOG_NAMESPACE] as const

export const Route = createFileRoute("/_site/_marketing/blog")({
  head: ({ loaderData }) => ({ links: [{ href: docsCss, rel: "stylesheet" }, ...blogFeedLinks(loaderData)] }),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [{ title }] = await Promise.all([
      loadPageMetadata({ locale, namespace: BLOG_NAMESPACE }),
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
    ])
    return { locale, title }
  },
  pendingComponent: BlogPending,
  staticData: { namespaces: NAMESPACES },
})
