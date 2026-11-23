import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { COURSE_COVER_PATH_PREFIX, coverContentType } from "~/src/modules/course/course.cover"
import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { emptyResponse, isReadRequest, methodNotAllowed } from "~/src/lib/media-response"

const CACHE_CONTROL = "public, max-age=31536000, immutable"
const EDGE_CACHE_NAME = "covers"

const COVER_PATH = new URLPattern({
  pathname: `${COURSE_COVER_PATH_PREFIX}/:courseId([0-9a-f\\-]{36})/:file([0-9a-f\\-]{36}(?:-\\d{1,4})?\\.[a-z]{3,4})`,
})

const coverHeaders = ({ contentType, object }: { readonly contentType: string; readonly object: R2Object }): Headers =>
  new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Length": String(object.size),
    "Content-Type": contentType,
    ETag: object.httpEtag,
  })

const serveHead = async ({ contentType, key }: { readonly contentType: string; readonly key: string }): Promise<Response> => {
  const head = await env.MEDIA.head(key)
  if (head === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  return emptyResponse(HTTP_STATUS.OK, coverHeaders({ contentType, object: head }))
}

const serveBody = async ({ contentType, key, url }: { readonly contentType: string; readonly key: string; readonly url: URL }) => {
  const cache = await caches.open(EDGE_CACHE_NAME)
  const cacheKey = new Request(url)
  const cached = await cache.match(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  const object = await env.MEDIA.get(key)
  if (object === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const response = new Response(object.body, { headers: coverHeaders({ contentType, object }) })
  waitUntil(cache.put(cacheKey, response.clone()))

  return response
}

export const serveCover = (request: Request): Promise<Response> => {
  if (!isReadRequest(request)) {
    return Promise.resolve(methodNotAllowed())
  }

  const url = new URL(request.url)
  const key = url.pathname.slice(MEDIA_PATH_PREFIX.length + 1)
  const contentType = coverContentType(key)
  if (!COVER_PATH.test(url) || contentType === undefined) {
    return Promise.resolve(emptyResponse(HTTP_STATUS.NOT_FOUND))
  }

  return request.method === "HEAD" ? serveHead({ contentType, key }) : serveBody({ contentType, key, url })
}
