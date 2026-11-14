import "@tanstack/react-start/server-only"

import { env, waitUntil } from "cloudflare:workers"

import zod from "zod/v4"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { mediaContentType, videoObjectKey } from "~/src/modules/video/video.files"
import { verifyPlayback } from "~/src/modules/video/video.playback"

const MEDIA_REQUEST = /^\/media\/(?<expires>[\da-z]{1,10})\.(?<signature>[\da-f]{64})\/(?<videoId>[\da-f-]{36})\/(?<file>[\w./-]+)$/u
const BYTE_RANGE = /^bytes=(?<start>\d*)-(?<end>\d*)$/u

const CLIENT_CACHE_CONTROL = "private, max-age=86400, immutable"
const EDGE_CACHE_CONTROL = "public, max-age=31536000, immutable"
const EDGE_CACHE_PATH = "/media/_"
const EDGE_CACHE_NAME = "media"
const INCLUSIVE_END = 1

const mediaRequestSchema = zod.object({
  expires: zod.string(),
  file: zod.string(),
  signature: zod.string(),
  videoId: zod.string(),
})

const rangeSchema = zod.object({ end: zod.string(), start: zod.string() })

interface ByteRange {
  readonly length: number
  readonly offset: number
}

const emptyResponse = (status: number, headers: HeadersInit = {}): Response => new Response(undefined, { headers, status })

const mediaHeaders = ({ contentType, object }: { readonly contentType: string; readonly object: R2Object }): Headers =>
  new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": CLIENT_CACHE_CONTROL,
    "Content-Length": String(object.size),
    "Content-Type": contentType,
    ETag: object.httpEtag,
  })

const resolveRange = ({ header, size }: { readonly header: string; readonly size: number }): ByteRange | undefined => {
  const parsed = rangeSchema.safeParse(BYTE_RANGE.exec(header)?.groups)
  if (!parsed.success || (parsed.data.start === "" && parsed.data.end === "")) {
    return undefined
  }

  const { end, start } = parsed.data
  if (start === "") {
    const suffix = Math.min(Number(end), size)
    return { length: suffix, offset: size - suffix }
  }

  const offset = Number(start)
  const lastByte = size - INCLUSIVE_END
  const last = end === "" ? lastByte : Math.min(Number(end), lastByte)
  if (offset > last) {
    return undefined
  }

  return { length: last - offset + INCLUSIVE_END, offset }
}

const servePartial = async ({
  contentType,
  header,
  key,
}: {
  readonly contentType: string
  readonly header: string
  readonly key: string
}) => {
  const head = await env.MEDIA.head(key)
  if (head === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const range = resolveRange({ header, size: head.size })
  if (range === undefined) {
    return emptyResponse(HTTP_STATUS.RANGE_NOT_SATISFIABLE, { "Content-Range": `bytes */${String(head.size)}` })
  }

  const object = await env.MEDIA.get(key, { range })
  if (object === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const headers = mediaHeaders({ contentType, object })
  headers.set("Content-Length", String(range.length))
  headers.set(
    "Content-Range",
    `bytes ${String(range.offset)}-${String(range.offset + range.length - INCLUSIVE_END)}/${String(object.size)}`,
  )

  return new Response(object.body, { headers, status: HTTP_STATUS.PARTIAL_CONTENT })
}

const serveWhole = async ({
  cacheKey,
  contentType,
  key,
}: {
  readonly cacheKey: Request
  readonly contentType: string
  readonly key: string
}) => {
  const cache = await caches.open(EDGE_CACHE_NAME)
  const cached = await cache.match(cacheKey)
  if (cached !== undefined) {
    const response = new Response(cached.body, cached)
    response.headers.set("Cache-Control", CLIENT_CACHE_CONTROL)
    return response
  }

  const object = await env.MEDIA.get(key)
  if (object === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const response = new Response(object.body, { headers: mediaHeaders({ contentType, object }) })
  const edgeCopy = response.clone()
  edgeCopy.headers.set("Cache-Control", EDGE_CACHE_CONTROL)
  waitUntil(cache.put(cacheKey, edgeCopy))

  return response
}

export const serveMedia = async (request: Request): Promise<Response> => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return emptyResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, { Allow: "GET, HEAD" })
  }

  const url = new URL(request.url)
  const parsed = mediaRequestSchema.safeParse(MEDIA_REQUEST.exec(url.pathname)?.groups)
  const contentType = parsed.success ? mediaContentType(parsed.data.file) : undefined
  if (!parsed.success || contentType === undefined) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const { expires, file, signature, videoId } = parsed.data
  if (!(await verifyPlayback({ expires, now: Date.now(), secret: env.AUTH_SECRET, signature, videoId }))) {
    return emptyResponse(HTTP_STATUS.FORBIDDEN)
  }

  const key = videoObjectKey({ file, videoId })

  if (request.method === "HEAD") {
    const head = await env.MEDIA.head(key)
    if (head === null) {
      return emptyResponse(HTTP_STATUS.NOT_FOUND)
    }
    return new Response(undefined, { headers: mediaHeaders({ contentType, object: head }) })
  }

  const range = request.headers.get("Range")
  if (range !== null) {
    return servePartial({ contentType, header: range, key })
  }

  return serveWhole({ cacheKey: new Request(new URL(`${EDGE_CACHE_PATH}/${videoId}/${file}`, url)), contentType, key })
}
