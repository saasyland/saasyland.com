import { MEDIA_PATH_PREFIX, VIDEO_FILES } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { signHmac, verifyHmac } from "~/src/lib/hmac"

const SIGNING_INFO = "saasyland:video-playback"
export const PLAYBACK_TTL_SECONDS = 21_600
const PLAYBACK_EXPIRY_STEP_SECONDS = 3600
const EXPIRY_RADIX = 36

const signedMessage = ({ expires, videoId }: { readonly expires: string; readonly videoId: string }): string => `${videoId}.${expires}`

interface PlaybackGrant {
  readonly now: number
  readonly secret: string
  readonly video: Pick<Video["select"], "captionLocales" | "id">
}

export const createPlayback = async ({ now, secret, video }: PlaybackGrant) => {
  const earliestExpiry = Math.floor(now / MILLISECONDS_PER_SECOND) + PLAYBACK_TTL_SECONDS
  const expires = (Math.ceil(earliestExpiry / PLAYBACK_EXPIRY_STEP_SECONDS) * PLAYBACK_EXPIRY_STEP_SECONDS).toString(EXPIRY_RADIX)
  const signature = await signHmac({ info: SIGNING_INFO, message: signedMessage({ expires, videoId: video.id }), secret })
  const base = `${MEDIA_PATH_PREFIX}/${expires}.${signature}/${video.id}`

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

export const verifyPlayback = async ({ expires, now, secret, signature, videoId }: PlaybackClaim): Promise<boolean> =>
  Number.parseInt(expires, EXPIRY_RADIX) * MILLISECONDS_PER_SECOND > now &&
  (await verifyHmac({ info: SIGNING_INFO, message: signedMessage({ expires, videoId }), secret, signature }))
