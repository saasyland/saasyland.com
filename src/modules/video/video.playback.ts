import { MEDIA_PATH_PREFIX, VIDEO_FILES } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { fromHex, toHex } from "~/src/lib/hex"

const SIGNING_INFO = "saasyland:video-playback"
const MILLISECONDS_PER_SECOND = 1000
export const PLAYBACK_TTL_SECONDS = 21_600
const PLAYBACK_EXPIRY_STEP_SECONDS = 3600
const EXPIRY_RADIX = 36

const encoder = new TextEncoder()
const signingKeys = new Map<string, Promise<CryptoKey>>()

const signingKey = (secret: string): Promise<CryptoKey> => {
  const existing = signingKeys.get(secret)
  if (existing !== undefined) {
    return existing
  }

  const key = crypto.subtle
    .importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"])
    .then((material) =>
      crypto.subtle.deriveKey(
        { hash: "SHA-256", info: encoder.encode(SIGNING_INFO), name: "HKDF", salt: new Uint8Array() },
        material,
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign", "verify"],
      ),
    )
  signingKeys.set(secret, key)

  return key
}

const signedMessage = ({ expires, videoId }: { readonly expires: string; readonly videoId: string }): Uint8Array<ArrayBuffer> =>
  encoder.encode(`${videoId}.${expires}`)

interface PlaybackGrant {
  readonly now: number
  readonly secret: string
  readonly video: Pick<Video["select"], "captionLocales" | "id">
}

export const createPlayback = async ({ now, secret, video }: PlaybackGrant) => {
  const earliestExpiry = Math.floor(now / MILLISECONDS_PER_SECOND) + PLAYBACK_TTL_SECONDS
  const expires = (Math.ceil(earliestExpiry / PLAYBACK_EXPIRY_STEP_SECONDS) * PLAYBACK_EXPIRY_STEP_SECONDS).toString(EXPIRY_RADIX)
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), signedMessage({ expires, videoId: video.id }))
  const base = `${MEDIA_PATH_PREFIX}/${expires}.${toHex(new Uint8Array(signature))}/${video.id}`

  return {
    captions: video.captionLocales.map((locale) => ({ locale, src: `${base}/captions/${locale}.vtt` })),
    poster: `${base}/${VIDEO_FILES.POSTER}`,
    posterSmall: `${base}/${VIDEO_FILES.POSTER_SMALL}`,
    src: `${base}/${VIDEO_FILES.MASTER_PLAYLIST}`,
    storyboard: `${base}/${VIDEO_FILES.STORYBOARD_TRACK}`,
  }
}

interface PlaybackClaim {
  readonly expires: string
  readonly now: number
  readonly secret: string
  readonly signature: string
  readonly videoId: string
}

export const verifyPlayback = async ({ expires, now, secret, signature, videoId }: PlaybackClaim): Promise<boolean> => {
  if (Number.parseInt(expires, EXPIRY_RADIX) * MILLISECONDS_PER_SECOND <= now) {
    return false
  }

  return crypto.subtle.verify("HMAC", await signingKey(secret), fromHex(signature), signedMessage({ expires, videoId }))
}
