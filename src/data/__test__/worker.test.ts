import { describe, expect, it, vi } from "vite-plus/test"

import { WORKER_HANDLER_KIND, type WorkerHandler } from "~/src/data/worker.constants"
import * as AREA_WORKER_HANDLERS from "~/src/data/worker.entries"

const rewrite = (document: Response): Response => document
const fetch = (): Promise<Response> => Promise.resolve(new Response("area file"))

describe("Worker handler composition", () => {
  it("files every handler an area declares under its kind exactly once", async () => {
    const { DOCUMENT_HANDLERS, REQUEST_HANDLERS } = await import("~/src/data/worker")
    const declared: readonly WorkerHandler[] = Object.values(AREA_WORKER_HANDLERS).flat()

    expect(DOCUMENT_HANDLERS.length + REQUEST_HANDLERS.length).toBe(declared.length)
    expect(declared.filter((handler) => handler.kind === WORKER_HANDLER_KIND.DOCUMENT)).toStrictEqual(DOCUMENT_HANDLERS)
    expect(declared.filter((handler) => handler.kind === WORKER_HANDLER_KIND.REQUEST)).toStrictEqual(REQUEST_HANDLERS)
  })

  it("gives every request handler a path prefix that no other handler's prefix contains", async () => {
    const { REQUEST_HANDLERS } = await import("~/src/data/worker")
    const prefixes = REQUEST_HANDLERS.map(({ pathPrefix }) => pathPrefix)

    expect(prefixes.filter((prefix) => prefixes.some((other) => other !== prefix && prefix.startsWith(other)))).toStrictEqual([])
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })

  it("splits the handlers of every area into document and request handlers", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/worker.entries", () => ({
      FIRST_WORKER_HANDLERS: [{ kind: WORKER_HANDLER_KIND.DOCUMENT, rewrite }],
      SECOND_WORKER_HANDLERS: [
        { fetch, kind: WORKER_HANDLER_KIND.REQUEST, pathPrefix: "/files/" },
        { kind: WORKER_HANDLER_KIND.DOCUMENT, rewrite },
      ],
    }))

    const { DOCUMENT_HANDLERS, REQUEST_HANDLERS } = await import("~/src/data/worker")

    expect(DOCUMENT_HANDLERS).toStrictEqual([
      { kind: WORKER_HANDLER_KIND.DOCUMENT, rewrite },
      { kind: WORKER_HANDLER_KIND.DOCUMENT, rewrite },
    ])
    expect(REQUEST_HANDLERS).toStrictEqual([{ fetch, kind: WORKER_HANDLER_KIND.REQUEST, pathPrefix: "/files/" }])
    vi.doUnmock("~/src/data/worker.entries")
  })

  it("leaves both lists empty when no area adds a handler", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/worker.entries", () => ({}))

    const { DOCUMENT_HANDLERS, REQUEST_HANDLERS } = await import("~/src/data/worker")

    expect([DOCUMENT_HANDLERS, REQUEST_HANDLERS]).toStrictEqual([[], []])
    vi.doUnmock("~/src/data/worker.entries")
  })
})
