import { createRootRoute, redirect } from "@tanstack/react-router"
import { expect, it, vi } from "vite-plus/test"

import { recheckRefusedSession } from "~/src/integrations/better-auth/auth.routes"

import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

vi.mock(import("~/src/integrations/better-auth/auth.routes"), async (importOriginal) => ({
  ...(await importOriginal()),
  recheckRefusedSession: vi.fn<typeof recheckRefusedSession>().mockResolvedValue(undefined),
}))

vi.mock("~/src/routeTree.gen", () => ({ routeTree: createRootRoute() }))

const leave = (): never => {
  throw redirect({ to: ROUTES.AUTH.SIGN_IN })
}

it("navigates in the browser to the redirect a query or a mutation throws, so a server function they call may redirect", async () => {
  const router = getRouter()
  const { queryClient } = router.options.context
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()

  await expect(queryClient.query({ queryFn: leave, queryKey: ["redirected"] })).rejects.toMatchObject({
    options: { to: ROUTES.AUTH.SIGN_IN },
  })
  await expect(queryClient.getMutationCache().build(queryClient, { mutationFn: leave }).execute(undefined)).rejects.toMatchObject({
    options: { to: ROUTES.AUTH.SIGN_IN },
  })

  expect(navigate.mock.calls.map(([options]) => options.to)).toStrictEqual([ROUTES.AUTH.SIGN_IN, ROUTES.AUTH.SIGN_IN])
  expect(vi.mocked(recheckRefusedSession)).not.toHaveBeenCalled()
})
