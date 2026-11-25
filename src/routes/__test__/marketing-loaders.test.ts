import { createMemoryHistory, rootRouteId } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as MarketingRoute } from "~/src/routes/_site._marketing"
import { Route as NotFoundRoute } from "~/src/routes/_site._marketing.$"

import { TIER_PRICES } from "~/src/data/license"

import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"
import { ROBOTS } from "~/src/lib/seo"

import pagesLandingMessages from "~/messages/en-US/pages.landing.json"
import { getRouter } from "~/src/router"

vi.mock("virtual:content-indexes", () => ({ loadBlogIndex: vi.fn(() => Promise.resolve([])) }))

const createRouterAt = (path: string) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = getRouter()
  router.options.context.queryClient.setDefaultOptions({ queries: { retry: false } })
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  return router
}

const load = async (path: string) => {
  const router = createRouterAt(path)
  await router.load()
  return router
}

describe("landing loader", () => {
  it("describes the page with the entry price from TIER_PRICES", async () => {
    const router = await load("/")
    const price = new Intl.NumberFormat("en-US", CURRENCY_FORMAT).format(TIER_PRICES[LICENSE_TIER.CORE])
    expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
      metadata: {
        description: pagesLandingMessages.metadata.description
          .replace("{price}", price)
          .replace("{coverageThreshold, number}", String(REPOSITORY_FACTS.coverageThreshold))
          .replace("{languages, number}", String(REPOSITORY_FACTS.languages)),
        title: pagesLandingMessages.metadata.title,
      },
    })
  })
})

describe("unknown paths", () => {
  it.each(["/nope", "/pl-PL/a/b/c", "/auth/nope", "/admin/nope"])(
    "answers the unknown path %s from the site's not-found route",
    async (path) => {
      const router = await load(path)
      const notFoundMatch = router.state.matches.at(-1)
      expect(router.state.matches.map(({ routeId }) => routeId)).toStrictEqual([
        rootRouteId,
        SiteRoute.id,
        MarketingRoute.id,
        NotFoundRoute.id,
      ])
      expect(notFoundMatch?.status).toBe("notFound")
      expect(notFoundMatch?.meta).toContainEqual({ content: ROBOTS.NOINDEX, name: "robots" })
    },
  )
})
