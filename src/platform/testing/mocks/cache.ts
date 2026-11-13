import { vi } from "vite-plus/test"

export const createEdgeCache = () => {
  const entries = new Map<string, Response>()
  const cache = {
    match: vi.fn((request: Request) => Promise.resolve(entries.get(request.url)?.clone())),
    put: vi.fn((request: Request, response: Response) => {
      entries.set(request.url, response)
      return Promise.resolve()
    }),
  }
  vi.stubGlobal("caches", { open: vi.fn(() => Promise.resolve(cache)) })
  return { cache, entries }
}
