import {
  LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS,
  LESSON_ATTACHMENT_PATH_PREFIX,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { attachmentFileNameOf, attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"

import { signHmac, verifyHmac } from "~/src/lib/hmac"
import { isUnexpired, signedExpiry } from "~/src/lib/signed-expiry"

const SIGNING_INFO = "saasyland:lesson-attachment"

export const SIGNED_DOWNLOAD_PATH = new URLPattern({
  pathname: `${LESSON_ATTACHMENT_PATH_PREFIX}/:expires([0-9a-z]{1,10}).:signature([0-9a-f]{64})/:attachmentId([0-9a-f\\-]{36})/:fileName([\\w.\\-]+)`,
})

const signedMessage = ({ expires, objectKey }: { readonly expires: string; readonly objectKey: string }): string =>
  `${objectKey}.${expires}`

interface DownloadGrant {
  readonly attachmentId: string
  readonly now: number
  readonly objectKey: string
  readonly secret: string
}

export const signDownload = async ({ attachmentId, now, objectKey, secret }: DownloadGrant): Promise<string> => {
  const expires = signedExpiry({ now, ttlSeconds: LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS })
  const signature = await signHmac({ info: SIGNING_INFO, message: signedMessage({ expires, objectKey }), secret })

  return `${LESSON_ATTACHMENT_PATH_PREFIX}/${expires}.${signature}/${attachmentId}/${attachmentFileNameOf(objectKey)}`
}

interface DownloadClaim {
  readonly attachmentId: string
  readonly expires: string
  readonly fileName: string
  readonly now: number
  readonly secret: string
  readonly signature: string
}

export const verifyDownload = async ({ attachmentId, expires, fileName, now, secret, signature }: DownloadClaim): Promise<boolean> =>
  isUnexpired({ expires, now }) &&
  (await verifyHmac({
    info: SIGNING_INFO,
    message: signedMessage({ expires, objectKey: attachmentObjectKey({ attachmentId, fileName }) }),
    secret,
    signature,
  }))
