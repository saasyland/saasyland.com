import { getRequest } from "@tanstack/react-start/server"
import * as matchers from "@testing-library/jest-dom/matchers"
import { beforeEach, expect, vi } from "vite-plus/test"

import { resetTestBindings } from "~/src/platform/testing/mocks/cloudflare"

expect.extend(matchers)

beforeEach(() => {
  resetTestBindings()
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/"))
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
