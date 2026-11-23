import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { apiZodSchemas } from "@saasyland/stack/api"
import * as zod from "zod"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { SIGNED_BUNDLE_PATH, bundleObjectKey, verifyBundle } from "~/src/modules/license/license.bundles"
import { BUNDLE_CONTENT_TYPE } from "~/src/modules/license/license.constants"

import { emptyResponse, isReadRequest, methodNotAllowed } from "~/src/lib/media-response"

const CACHE_CONTROL = "private, no-store"

const signedPathSchema = zod.object({ expiry: zod.string(), signature: zod.string(), version: apiZodSchemas.version })

const bundleHeaders = ({ httpEtag, size }: R2Object): Headers =>
  new Headers({
    "Cache-Control": CACHE_CONTROL,
    "Content-Length": String(size),
    "Content-Type": BUNDLE_CONTENT_TYPE,
    ETag: httpEtag,
  })

export const serveBundle = async (request: Request): Promise<Response> => {
  if (!isReadRequest(request)) {
    return methodNotAllowed()
  }

  const signed = signedPathSchema.safeParse(SIGNED_BUNDLE_PATH.exec(request.url)?.pathname.groups)
  if (!signed.success) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const { expiry, signature, version } = signed.data
  if (!(await verifyBundle({ expiry, now: Date.now(), secret: env.AUTH_SECRET, signature, version }))) {
    return emptyResponse(HTTP_STATUS.FORBIDDEN)
  }

  const key = bundleObjectKey(version)

  if (request.method === "HEAD") {
    const head = await env.BUNDLES.head(key)
    return head === null ? emptyResponse(HTTP_STATUS.NOT_FOUND) : emptyResponse(HTTP_STATUS.OK, bundleHeaders(head))
  }

  const object = await env.BUNDLES.get(key)
  return object === null ? emptyResponse(HTTP_STATUS.NOT_FOUND) : new Response(object.body, { headers: bundleHeaders(object) })
}
