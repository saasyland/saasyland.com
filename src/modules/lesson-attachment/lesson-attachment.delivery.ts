import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import * as zod from "zod"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { SIGNED_DOWNLOAD_PATH, verifyDownload } from "~/src/modules/lesson-attachment/lesson-attachment.download"
import { attachmentContentType, attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"

const CACHE_CONTROL = "private, no-store"
const ALLOWED_METHODS = "GET, HEAD"

const signedPathSchema = zod.object({
  attachmentId: zod.string(),
  expires: zod.string(),
  fileName: zod.string(),
  signature: zod.string(),
})

const emptyResponse = (status: number, headers: HeadersInit = {}): Response => new Response(undefined, { headers, status })

interface DownloadHeaders {
  readonly contentType: string
  readonly fileName: string
  readonly object: R2Object
}

const downloadHeaders = ({ contentType, fileName, object }: DownloadHeaders): Headers =>
  new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": String(object.size),
    "Content-Type": contentType,
    ETag: object.httpEtag,
  })

export const serveAttachment = async (request: Request): Promise<Response> => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return emptyResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, { Allow: ALLOWED_METHODS })
  }

  const signed = signedPathSchema.safeParse(SIGNED_DOWNLOAD_PATH.exec(request.url)?.pathname.groups)
  const contentType = signed.success ? attachmentContentType(signed.data.fileName) : undefined
  if (!signed.success || contentType === undefined) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const { attachmentId, expires, fileName, signature } = signed.data
  if (!(await verifyDownload({ attachmentId, expires, fileName, now: Date.now(), secret: env.AUTH_SECRET, signature }))) {
    return emptyResponse(HTTP_STATUS.FORBIDDEN)
  }

  const key = attachmentObjectKey({ attachmentId, fileName })

  if (request.method === "HEAD") {
    const head = await env.MEDIA.head(key)
    if (head === null) {
      return emptyResponse(HTTP_STATUS.NOT_FOUND)
    }
    return new Response(undefined, { headers: downloadHeaders({ contentType, fileName, object: head }) })
  }

  const object = await env.MEDIA.get(key)
  if (object === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  return new Response(object.body, { headers: downloadHeaders({ contentType, fileName, object }) })
}
