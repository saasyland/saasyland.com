import { CONTENT_SECURITY_POLICY } from "~/src/modules/_core/constants/api"

import { randomHex } from "~/src/lib/hex"

const NONCE_LENGTH = 32

export const scriptPolicy = (sources: readonly string[]): string =>
  [
    `script-src ${[...sources, CONTENT_SECURITY_POLICY.SCRIPT_FALLBACKS].join(" ")}`,
    CONTENT_SECURITY_POLICY.OBJECT_SRC,
    CONTENT_SECURITY_POLICY.BASE_URI,
  ].join("; ")

export const renderedPagePolicy = (nonce: string): string =>
  [scriptPolicy([`'nonce-${nonce}'`]), CONTENT_SECURITY_POLICY.FRAME_ANCESTORS].join("; ")

export const createNonce = (): string => randomHex(NONCE_LENGTH)
