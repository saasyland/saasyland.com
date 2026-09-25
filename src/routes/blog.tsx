import type { JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BlogHeader } from "~/src/presentation/components/custom/blog/components/blog-header"
import { Footer } from "~/src/presentation/components/custom/footer/footer"
import { PageFrame } from "~/src/presentation/components/custom/page-frame"

import docsCss from "~/src/presentation/styles/docs.css?url"

const BlogLayout = (): JSX.Element => (
  <div className="dark relative isolate min-h-svh bg-background text-foreground">
    <PageFrame />
    <BlogHeader />
    <main className="relative z-10">
      <Outlet />
    </main>
    <Footer />
  </div>
)

const DOCS_STYLESHEET = [{ href: docsCss, rel: "stylesheet" as const }]

export const Route = createFileRoute("/blog")({
  component: BlogLayout,
  head: () => ({ links: DOCS_STYLESHEET }),
  loader: ({ context }) =>
    preloadNamespaces({
      locale: getCurrentLocale(),
      namespaces: [
        "auth.validations",
        "pages.blog",
        "pages.landing",
        "pages.newsletter",
        "product.errors",
        "product.validations",
        "user.validations",
      ],
      queryClient: context.queryClient,
    }),
  staticData: {
    namespaces: [
      "auth.validations",
      "pages.blog",
      "pages.landing",
      "pages.newsletter",
      "product.errors",
      "product.validations",
      "user.validations",
    ],
  },
})
