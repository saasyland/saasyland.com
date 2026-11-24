import type { Environment } from "@polar-sh/sdk/2026-10"

import { polarCheckoutOrigin } from "~/src/integrations/polar/polar.constants"

import { CONTENT_SECURITY_POLICY } from "~/src/modules/_core/constants/api"

import { randomHex } from "~/src/lib/hex"

const NONCE_LENGTH = 32
const NONCE_ATTRIBUTE = "nonce"

export const documentPolicy = (nonce: string, polarServer: Environment): string =>
  [
    `script-src 'nonce-${nonce}' ${CONTENT_SECURITY_POLICY.SCRIPT_FALLBACKS}`,
    `frame-src ${polarCheckoutOrigin(polarServer)}`,
    CONTENT_SECURITY_POLICY.OBJECT_SRC,
    CONTENT_SECURITY_POLICY.BASE_URI,
    CONTENT_SECURITY_POLICY.FRAME_ANCESTORS,
  ].join("; ")

export const createNonce = (): string => randomHex(NONCE_LENGTH)

export const withNonce = (page: Response, nonce: string): Response => {
  const nonceElement = {
    element: (element: { setAttribute: (name: string, value: string) => unknown }): void => {
      element.setAttribute(NONCE_ATTRIBUTE, nonce)
    },
  }

  return new HTMLRewriter()
    .on('script:not([type="application/ld+json"])', nonceElement)
    .on('link[rel="modulepreload"]', nonceElement)
    .on(`[${NONCE_ATTRIBUTE}]`, nonceElement)
    .on('meta[property="csp-nonce"]', {
      element: (meta) => {
        meta.setAttribute("content", nonce)
      },
    })
    .transform(page)
}
