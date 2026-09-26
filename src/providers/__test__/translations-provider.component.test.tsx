import { Suspense } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import commonMessages from "~/messages/en-US/common.json"
import pagesBlogMessages from "~/messages/en-US/pages.blog.json"

const Probe = () => {
  const t = useTranslations("common")
  return <span>{t("loading")}</span>
}

const BlogProbe = () => {
  const t = useTranslations("pages.blog")
  return <span>{t("nav.blog")}</span>
}

it("loads shared translations through React Query before rendering consumers", async () => {
  const { queryClient } = renderWithRouter(
    <Suspense fallback="pending">
      <TranslationsProvider>
        <Probe />
      </TranslationsProvider>
    </Suspense>,
  )
  expect(await screen.findByText(commonMessages.loading)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "common" }).queryKey)).toEqual(commonMessages)
})

it("adds the namespaces declared by matched routes to the shared translations", async () => {
  const root = createRootRoute({
    component: () => (
      <Suspense fallback="pending">
        <TranslationsProvider>
          <Probe />
          <Outlet />
        </TranslationsProvider>
      </Suspense>
    ),
  })
  const blog = createRoute({ component: BlogProbe, getParentRoute: () => root, path: "/blog", staticData: { namespaces: ["pages.blog"] } })
  const router = createRouter({ history: createMemoryHistory({ initialEntries: ["/blog"] }), routeTree: root.addChildren([blog]) })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  expect(await screen.findByText(pagesBlogMessages.nav.blog)).toBeInTheDocument()
  expect(screen.getByText(commonMessages.loading)).toBeInTheDocument()
  expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "pages.blog" }).queryKey)).toEqual(pagesBlogMessages)
})
