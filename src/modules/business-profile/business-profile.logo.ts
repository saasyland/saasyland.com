import { BYTES_PER_MEGABYTE } from "~/src/lib/file-size"
import { IMAGE_TYPES, MEDIA_PATH_PREFIX } from "~/src/lib/media-response"

const BUSINESS_LOGO_KEY_PREFIX = "logos"

export const BUSINESS_LOGO_PATH_PREFIX = `${MEDIA_PATH_PREFIX}/${BUSINESS_LOGO_KEY_PREFIX}`

export const BUSINESS_LOGO_MAX_SIDE = 512

export const BUSINESS_LOGO_MAX_MEGABYTES = 10

export const BUSINESS_LOGO_MAX_BYTES = BUSINESS_LOGO_MAX_MEGABYTES * BYTES_PER_MEGABYTE

export const BUSINESS_LOGO_SOURCE_TYPES = {
  avif: IMAGE_TYPES.AVIF,
  jpeg: IMAGE_TYPES.JPEG,
  png: IMAGE_TYPES.PNG,
  webp: IMAGE_TYPES.WEBP,
} as const

export const BUSINESS_LOGO_STORED_TYPES = {
  png: IMAGE_TYPES.PNG,
  webp: IMAGE_TYPES.WEBP,
} as const

export const BUSINESS_LOGO_QUALITY = 0.9

export const BUSINESS_LOGO_UPLOADS_PER_MINUTE = 10

const EXTENSION_SEPARATOR = "."
const IMAGE_FIELD = "image"

type LogoExtension = keyof typeof BUSINESS_LOGO_STORED_TYPES

type LogoType = (typeof BUSINESS_LOGO_STORED_TYPES)[LogoExtension]

const LOGO_TYPES: ReadonlyMap<string, LogoType> = new Map(Object.entries(BUSINESS_LOGO_STORED_TYPES))

const isLogoExtension = (extension: string): extension is LogoExtension => LOGO_TYPES.has(extension)

export const logoExtension = (contentType: string): LogoExtension | undefined =>
  Object.keys(BUSINESS_LOGO_STORED_TYPES)
    .filter((extension) => isLogoExtension(extension))
    .find((extension) => BUSINESS_LOGO_STORED_TYPES[extension] === contentType)

export const logoContentType = (key: string): LogoType | undefined => LOGO_TYPES.get(key.slice(key.lastIndexOf(EXTENSION_SEPARATOR) + 1))

export const logoObjectKey = ({ extension, logoId }: { readonly extension: LogoExtension; readonly logoId: string }): string =>
  `${BUSINESS_LOGO_KEY_PREFIX}/${logoId}${EXTENSION_SEPARATOR}${extension}`

export const businessLogoPath = (logo: string): string => `${MEDIA_PATH_PREFIX}/${logo}`

export const logoFormData = (image: Blob): FormData => {
  const form = new FormData()
  form.set(IMAGE_FIELD, image)

  return form
}

export const logoEntries = (form: FormData) => ({ image: form.get(IMAGE_FIELD) })
