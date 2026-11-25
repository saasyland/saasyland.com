import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

export const MEDIA_PATH_PREFIX = "/media"

export const IMAGE_TYPES = {
  AVIF: "image/avif",
  JPEG: "image/jpeg",
  PNG: "image/png",
  WEBP: "image/webp",
} as const

const READ_METHODS = new Set(["GET", "HEAD"])

export const emptyResponse = (status: number, headers: HeadersInit = {}): Response => new Response(undefined, { headers, status })

export const isReadRequest = ({ method }: Request): boolean => READ_METHODS.has(method)

export const methodNotAllowed = (): Response => emptyResponse(HTTP_STATUS.METHOD_NOT_ALLOWED, { Allow: [...READ_METHODS].join(", ") })
