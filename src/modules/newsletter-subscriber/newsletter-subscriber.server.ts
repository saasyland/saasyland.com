import "@tanstack/react-start/server-only"

import { appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"
import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

export const newsletterRequestOrigin = (request: Request): string => {
  const url = new URL(request.url)
  const mode = import.meta.env.MODE
  const isTrustedProtocol = url.protocol === "https:" || (isLocalMode(mode) && url.protocol === "http:")

  if (!isTrustedProtocol || !appHostsForMode(mode).includes(url.host)) {
    throw new AppError(ERROR_CODES.FORBIDDEN)
  }

  return url.origin
}
