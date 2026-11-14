import { destroyAnnouncer } from "@react-aria/live-announcer"
import { getRequest } from "@tanstack/react-start/server"
import * as matchers from "@testing-library/jest-dom/matchers"
import { afterEach, beforeEach, expect, vi } from "vite-plus/test"

import { resetTestBindings } from "~/src/platform/testing/mocks/cloudflare"
import { fetchFromProviders, resetProviderDoubles, takeProviderRefusals } from "~/src/platform/testing/mocks/providers"

expect.extend(matchers)

beforeEach(() => {
  resetTestBindings()
  resetProviderDoubles()
  vi.stubGlobal("fetch", fetchFromProviders)
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/"))
})

afterEach(() => {
  destroyAnnouncer()
  expect(takeProviderRefusals(), "requests Resend or Polar would refuse").toStrictEqual([])
})

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")
  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})

vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/")) }
})
