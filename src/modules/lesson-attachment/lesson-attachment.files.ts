import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import {
  LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH,
  LESSON_ATTACHMENT_FILE_TYPES,
  LESSON_ATTACHMENT_KEY_PREFIX,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"

const EXTENSION_SEPARATOR = "."
const UNSAFE_CHARACTERS = /[^\w.-]+/gu
const COMBINING_MARKS = /\p{M}/gu
const LEADING_SEPARATORS = /^[.-]+/u
const HYPHENS_BEFORE_DOT = /-+(?=\.)/gu

export const UPLOAD_FIELDS = {
  FILE: "file",
  LESSON_ID: "lessonId",
  TITLE: "title",
} as const

const ATTACHMENT_TYPES: ReadonlyMap<string, string> = new Map(Object.entries(LESSON_ATTACHMENT_FILE_TYPES))

const extensionOf = (fileName: string): string => fileName.slice(fileName.lastIndexOf(EXTENSION_SEPARATOR) + 1).toLowerCase()

export const attachmentContentType = (fileName: string): string | undefined => ATTACHMENT_TYPES.get(extensionOf(fileName))

export const attachmentFileName = (name: string): string => {
  const safe = name
    .normalize("NFKD")
    .replaceAll(COMBINING_MARKS, "")
    .replaceAll(UNSAFE_CHARACTERS, "-")
    .replaceAll(HYPHENS_BEFORE_DOT, "")
    .replace(LEADING_SEPARATORS, "")
  if (safe.length <= LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH) {
    return safe
  }

  const extension = `${EXTENSION_SEPARATOR}${extensionOf(safe)}`

  return `${safe.slice(0, LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH - extension.length)}${extension}`
}

export const attachmentObjectKey = ({ attachmentId, fileName }: { readonly attachmentId: string; readonly fileName: string }): string =>
  `${LESSON_ATTACHMENT_KEY_PREFIX}/${attachmentId}/${fileName}`

export const attachmentFileNameOf = (objectKey: string): string => objectKey.slice(objectKey.lastIndexOf("/") + 1)

interface UploadValues {
  readonly file: File
  readonly lessonId: string
  readonly title: LocalizedText
}

export const uploadFormData = ({ file, lessonId, title }: UploadValues): FormData => {
  const form = new FormData()
  form.set(UPLOAD_FIELDS.FILE, file)
  form.set(UPLOAD_FIELDS.LESSON_ID, lessonId)
  for (const [locale, text] of Object.entries(title)) {
    form.set(`${UPLOAD_FIELDS.TITLE}.${locale}`, text)
  }

  return form
}

export const uploadEntries = (form: FormData, locales: readonly SupportedLocale[]) => ({
  file: form.get(UPLOAD_FIELDS.FILE),
  lessonId: form.get(UPLOAD_FIELDS.LESSON_ID),
  title: Object.fromEntries(
    locales.flatMap((locale) => {
      const text = form.get(`${UPLOAD_FIELDS.TITLE}.${locale}`)
      return text === null ? [] : [[locale, text]]
    }),
  ),
})
