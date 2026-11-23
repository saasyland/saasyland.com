import { createMemoryHistory } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { describe, expect, it, vi } from "vite-plus/test"

import { buildTitle } from "~/src/lib/seo"

import pagesWithdrawalMessages from "~/messages/en-US/pages.withdrawal.json"
import plPagesWithdrawalMessages from "~/messages/pl-PL/pages.withdrawal.json"
import { getRouter } from "~/src/router"
import * as ROUTES from "~/src/routes"

const load = async (path: string) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = getRouter()
  router.options.context.queryClient.setDefaultOptions({ queries: { retry: false } })
  router.update({ context: router.options.context, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router
}

describe("withdrawal page loader", () => {
  it.each([
    { locale: "en-US", messages: pagesWithdrawalMessages, path: ROUTES.WITHDRAWAL },
    { locale: "pl-PL", messages: plPagesWithdrawalMessages, path: `/pl-PL${ROUTES.WITHDRAWAL}` },
  ] as const)("loads the page's copy and titles it in the language of $path", async ({ locale, messages, path }) => {
    const router = await load(path)
    const match = router.state.matches.at(-1)

    expect(match?.status).toBe("success")
    expect(match?.loaderData).toMatchObject({ metadata: messages.metadata })
    expect(match?.meta).toContainEqual({ title: buildTitle({ locale, title: messages.metadata.title }) })
  })
})
