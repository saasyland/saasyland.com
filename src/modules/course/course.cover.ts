import { BYTES_PER_MEGABYTE, MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

const COURSE_COVER_KEY_PREFIX = "covers"

export const COURSE_COVER_PATH_PREFIX = `${MEDIA_PATH_PREFIX}/${COURSE_COVER_KEY_PREFIX}`

export const COURSE_COVER_SIZE = { height: 900, width: 1600 } as const

const COURSE_COVER_SMALL_WIDTH = 480

const COURSE_COVER_MEDIUM_WIDTH = 960

export const COURSE_COVER_WIDTHS = [COURSE_COVER_SMALL_WIDTH, COURSE_COVER_MEDIUM_WIDTH, COURSE_COVER_SIZE.width] as const

export const COURSE_COVER_MAX_MEGABYTES = 10

export const COURSE_COVER_MAX_BYTES = COURSE_COVER_MAX_MEGABYTES * BYTES_PER_MEGABYTE

export const COURSE_COVER_SOURCE_TYPES = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const

export const COURSE_COVER_STORED_TYPES = {
  jpg: COURSE_COVER_SOURCE_TYPES.jpeg,
  webp: COURSE_COVER_SOURCE_TYPES.webp,
} as const

export const COURSE_COVER_QUALITY = 0.82

export const COURSE_COVER_UPLOADS_PER_MINUTE = 10

const EXTENSION_SEPARATOR = "."
const IMAGE_FIELD_PREFIX = "image-"
const COURSE_ID_FIELD = "courseId"

type CoverExtension = keyof typeof COURSE_COVER_STORED_TYPES

type CoverType = (typeof COURSE_COVER_STORED_TYPES)[CoverExtension]

type CoverWidth = (typeof COURSE_COVER_WIDTHS)[number]

interface CoverVariant {
  readonly image: Blob
  readonly width: CoverWidth
}

const COVER_TYPES: ReadonlyMap<string, CoverType> = new Map(Object.entries(COURSE_COVER_STORED_TYPES))

const isCoverExtension = (extension: string): extension is CoverExtension => COVER_TYPES.has(extension)

export const coverExtension = (contentType: string): CoverExtension | undefined =>
  Object.keys(COURSE_COVER_STORED_TYPES)
    .filter((extension) => isCoverExtension(extension))
    .find((extension) => COURSE_COVER_STORED_TYPES[extension] === contentType)

export const coverContentType = (key: string): CoverType | undefined => COVER_TYPES.get(key.slice(key.lastIndexOf(EXTENSION_SEPARATOR) + 1))

interface CoverKeyParts {
  readonly courseId: string
  readonly coverId: string
  readonly extension: CoverExtension
}

export const coverObjectKey = ({ courseId, coverId, extension }: CoverKeyParts): string =>
  `${COURSE_COVER_KEY_PREFIX}/${courseId}/${coverId}${EXTENSION_SEPARATOR}${extension}`

export const coverVariantKey = (cover: string, width: CoverWidth): string => {
  if (width === COURSE_COVER_SIZE.width) {
    return cover
  }

  const separator = cover.lastIndexOf(EXTENSION_SEPARATOR)

  return `${cover.slice(0, separator)}-${String(width)}${cover.slice(separator)}`
}

export const coverObjectKeys = (cover: string): string[] => COURSE_COVER_WIDTHS.map((width) => coverVariantKey(cover, width))

const coverPath = (key: string): string => `${MEDIA_PATH_PREFIX}/${key}`

interface CoverImage {
  readonly src: string
  readonly srcSet: string
}

export const courseCoverImage = (cover: string): CoverImage => ({
  src: coverPath(cover),
  srcSet: COURSE_COVER_WIDTHS.map((width) => `${coverPath(coverVariantKey(cover, width))} ${String(width)}w`).join(", "),
})

export const COVER_SIZES = COURSE_COVER_WIDTHS.map((width) => ({
  height: Math.round((width * COURSE_COVER_SIZE.height) / COURSE_COVER_SIZE.width),
  width,
}))

const imageField = (width: CoverWidth): string => `${IMAGE_FIELD_PREFIX}${String(width)}`

export const coverFormData = ({ courseId, variants }: { readonly courseId: string; readonly variants: readonly CoverVariant[] }) => {
  const form = new FormData()
  form.set(COURSE_ID_FIELD, courseId)
  for (const { image, width } of variants) {
    form.set(imageField(width), image)
  }

  return form
}

export const coverEntries = (form: FormData) => ({
  courseId: form.get(COURSE_ID_FIELD),
  variants: COURSE_COVER_WIDTHS.map((width) => ({ image: form.get(imageField(width)), width })),
})
