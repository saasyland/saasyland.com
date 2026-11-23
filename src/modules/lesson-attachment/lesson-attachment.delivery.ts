import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import * as zod from "zod"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { SIGNED_DOWNLOAD_PATH, verifyDownload } from "~/src/modules/lesson-attachment/lesson-attachment.download"
import { attachmentContentType, attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"

import { emptyResponse, isReadRequest, methodNotAllowed } from "~/src/lib/media-response"

const CACHE_CONTROL = "private, no-store"

const signedPathSchema = zod.object({
  attachmentId: zod.string(),
  expires: zod.string(),
  fileName: zod.string(),
  signature: zod.string(),
})

interface Download {
  readonly contentType: string
  readonly fileName: string
  readonly key: string
}

const downloadHeaders = ({ contentType, fileName }: Download, object: R2Object): Headers =>
  new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Content-Length": String(object.size),
    "Content-Type": contentType,
    ETag: object.httpEtag,
  })

const serveHead = async (download: Download): Promise<Response> => {
  const head = await env.MEDIA.head(download.key)
  if (head === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  return emptyResponse(HTTP_STATUS.OK, downloadHeaders(download, head))
}

const serveBody = async (download: Download): Promise<Response> => {
  const object = await env.MEDIA.get(download.key)
  if (object === null) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  return new Response(object.body, { headers: downloadHeaders(download, object) })
}

export const serveAttachment = async (request: Request): Promise<Response> => {
  if (!isReadRequest(request)) {
    return methodNotAllowed()
  }

  const signed = signedPathSchema.safeParse(SIGNED_DOWNLOAD_PATH.exec(request.url)?.pathname.groups)
  if (!signed.success) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const { attachmentId, expires, fileName, signature } = signed.data
  const contentType = attachmentContentType(fileName)
  if (contentType === undefined) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  if (!(await verifyDownload({ attachmentId, expires, fileName, now: Date.now(), secret: env.AUTH_SECRET, signature }))) {
    return emptyResponse(HTTP_STATUS.FORBIDDEN)
  }

  const download = { contentType, fileName, key: attachmentObjectKey({ attachmentId, fileName }) }

  return request.method === "HEAD" ? serveHead(download) : serveBody(download)
}
