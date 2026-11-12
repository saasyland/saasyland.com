import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { getRequest } from "@tanstack/react-start/server"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"

const renderAuthRedirect = (path: string) => {
  vi.mocked(getRequest).mockReturnValue(new Request(new URL(path, "http://127.0.0.1:3000")))
  const router = createTestRouter(path)
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders queryClient={queryClient} router={router}>
      {children}
    </TestProviders>
  )

  return { queryClient, result: renderHook(() => useAuthRedirect(), { wrapper }).result, router }
}

describe("useAuthRedirect", () => {
  it("reads the redirect and links to auth pages that keep it, in the visitor's locale", () => {
    const { result } = renderAuthRedirect("/pl-PL/auth/sign-in?redirect=%2Fpl-PL%2Fapp%2Flicense")

    expect(result.current.redirect).toBe("/pl-PL/app/license")
    expect(result.current.hrefWithRedirect("/auth/callback")).toBe("/pl-PL/auth/callback?redirect=%2Fpl-PL%2Fapp%2Flicense")
    expect(result.current.hrefWithRedirect("/auth/sign-in")).toBe("/pl-PL/auth/sign-in?redirect=%2Fpl-PL%2Fapp%2Flicense")
  })

  it("ignores a redirect that would leave the site", () => {
    const { result } = renderAuthRedirect("/auth/sign-in?redirect=%2F%2Fevil.example")

    expect(result.current.redirect).toBeUndefined()
    expect(result.current.hrefWithRedirect("/auth/callback")).toBe("/auth/callback")
  })

  it("finishes sign-in by clearing the previous account's data and continuing through the guarded callback with the redirect", async () => {
    const { queryClient, result, router } = renderAuthRedirect("/auth/sign-in?redirect=%2Fapp%2Flicense")
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue()
    const clearCache = vi.spyOn(router, "clearCache")
    queryClient.setQueryData(LICENSE_QUERY_KEYS.CURRENT, { key: "previous-license" })

    await act(() => result.current.finishSignIn())

    expect(queryClient.getQueryData(LICENSE_QUERY_KEYS.CURRENT)).toBeUndefined()
    expect(clearCache).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith({ replace: true, search: { redirect: "/app/license" }, to: "/auth/callback" })
  })
})
