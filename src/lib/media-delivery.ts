import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { MEDIA_PATH_PREFIX, emptyResponse, isReadRequest, methodNotAllowed } from "~/src/lib/media-response"

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"

interface StoredImage {
  readonly cacheName: string
  readonly contentType: string
  readonly key: string
}

export interface StoredImageRoute {
  readonly cacheName: string
  readonly contentType: (key: string) => string | undefined
  readonly pattern: URLPattern
}

const imageHeaders = ({ contentType, object }: { readonly contentType: string; readonly object: R2Object }): Headers =>
  new Headers({
    "Cache-Control": IMMUTABLE_CACHE_CONTROL,
    "Content-Length": String(object.size),
    "Content-Type": contentType,
    ETag: object.httpEtag,
  })

const serveHead = async ({ contentType, key }: StoredImage): Promise<Response> => {
  const head = await env.MEDIA.head(key)
  if (head === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  return emptyResponse(HTTP_STATUS.OK, imageHeaders({ contentType, object: head }))
}

const serveBody = async ({ cacheName, contentType, key }: StoredImage, url: URL): Promise<Response> => {
  const cache = await caches.open(cacheName)
  const cacheKey = new Request(url)
  const cached = await cache.match(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  const object = await env.MEDIA.get(key)
  if (object === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const response = new Response(object.body, { headers: imageHeaders({ contentType, object }) })
  waitUntil(cache.put(cacheKey, response.clone()))

  return response
}

export const serveStoredImage = (
  request: Request,
  { cacheName, contentType: contentTypeOf, pattern }: StoredImageRoute,
): Promise<Response> => {
  if (!isReadRequest(request)) {
    return Promise.resolve(methodNotAllowed())
  }

  const url = new URL(request.url)
  const key = url.pathname.slice(MEDIA_PATH_PREFIX.length + 1)
  const contentType = contentTypeOf(key)
  if (!pattern.test(url) || contentType === undefined) {
    return Promise.resolve(emptyResponse(HTTP_STATUS.NOT_FOUND))
  }

  const image = { cacheName, contentType, key }

  return request.method === "HEAD" ? serveHead(image) : serveBody(image, url)
}
