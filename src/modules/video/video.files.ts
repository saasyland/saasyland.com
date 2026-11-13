import { VIDEO_KEY_PREFIX } from "~/src/modules/video/video.constants"

const MEDIA_FILE_RULES = [
  { contentType: "application/vnd.apple.mpegurl", pattern: /^(?:master|[\da-z]+\/index)\.m3u8$/u },
  { contentType: "video/mp4", pattern: /^[\da-z]+\/init_\d+\.mp4$/u },
  { contentType: "video/iso.segment", pattern: /^[\da-z]+\/seg-\d+\.m4s$/u },
  { contentType: "image/webp", pattern: /^(?:poster(?:-\d+)?|storyboard)\.webp$/u },
  { contentType: "text/vtt; charset=utf-8", pattern: /^(?:storyboard|captions\/[a-z]{2}-[A-Z]{2})\.vtt$/u },
] as const

export const mediaContentType = (file: string): string | undefined =>
  MEDIA_FILE_RULES.find(({ pattern }) => pattern.test(file))?.contentType

export const videoDirectory = (videoId: string): string => `${VIDEO_KEY_PREFIX}/${videoId}/`

export const videoObjectKey = ({ file, videoId }: { readonly file: string; readonly videoId: string }): string =>
  `${videoDirectory(videoId)}${file}`
