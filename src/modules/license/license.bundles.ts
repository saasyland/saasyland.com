import { API_LIMIT } from "@saasyland/stack/api"

import { BUNDLE_ARCHIVE_EXTENSION, BUNDLE_PATH_PREFIX } from "~/src/modules/license/license.constants"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { signHmac, verifyHmac } from "~/src/lib/hmac"

const SIGNING_INFO = "saasyland:cli-bundle"
const EXPIRY_RADIX = 36
const HTTPS = "https"

export const SIGNED_BUNDLE_PATH = new URLPattern({
  pathname: `${BUNDLE_PATH_PREFIX}/:expiry([0-9a-z]{1,10}).:signature([0-9a-f]{64})/:version${BUNDLE_ARCHIVE_EXTENSION}`,
})

const signedMessage = ({ expiry, version }: { readonly expiry: string; readonly version: string }): string => `${version}.${expiry}`

export const bundleObjectKey = (version: string): string => `${version}${BUNDLE_ARCHIVE_EXTENSION}`

interface BundleGrant {
  readonly host: string
  readonly now: number
  readonly secret: string
  readonly version: string
}

export const signBundle = async ({ host, now, secret, version }: BundleGrant) => {
  const expires = Math.floor(now / MILLISECONDS_PER_SECOND) + API_LIMIT.BUNDLE_URL_TTL_SECONDS
  const expiry = expires.toString(EXPIRY_RADIX)
  const signature = await signHmac({ info: SIGNING_INFO, message: signedMessage({ expiry, version }), secret })

  return {
    expiresAt: new Date(expires * MILLISECONDS_PER_SECOND).toISOString(),
    url: `${HTTPS}://${host}${BUNDLE_PATH_PREFIX}/${expiry}.${signature}/${bundleObjectKey(version)}`,
  }
}

interface BundleClaim {
  readonly expiry: string
  readonly now: number
  readonly secret: string
  readonly signature: string
  readonly version: string
}

export const verifyBundle = async ({ expiry, now, secret, signature, version }: BundleClaim): Promise<boolean> =>
  Number.parseInt(expiry, EXPIRY_RADIX) * MILLISECONDS_PER_SECOND > now &&
  (await verifyHmac({ info: SIGNING_INFO, message: signedMessage({ expiry, version }), secret, signature }))
