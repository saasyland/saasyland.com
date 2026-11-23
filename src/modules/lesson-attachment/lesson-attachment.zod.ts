import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { MOVE_DIRECTIONS } from "~/src/modules/_core/constants/ordering"
import { localizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { MIN_FIELD_LENGTH, idField } from "~/src/modules/_core/utils/zod-fields"
import { LESSON_ATTACHMENT_MAX_BYTES, LESSON_ATTACHMENT_URL_MAX_LENGTH } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { attachmentContentType, attachmentFileName, uploadEntries } from "~/src/modules/lesson-attachment/lesson-attachment.files"

import { ROUTES } from "~/src/routes"

const HTTPS_PROTOCOL = "https:"
const DOCS_PATH = new RegExp(`^${ROUTES.DOCS}(?:/[\\da-z-]+)*(?:#[\\w-]+)?$`, "u")

const isHttpsUrl = (value: string): boolean => URL.canParse(value) && new URL(value).protocol === HTTPS_PROTOCOL

const attachmentIdInput = zod.object({
  attachmentId: idField,
})

const linkField = zod
  .string()
  .trim()
  .max(LESSON_ATTACHMENT_URL_MAX_LENGTH, { message: "urlInvalid" })
  .refine((value) => DOCS_PATH.test(value) || isHttpsUrl(value), { message: "urlInvalid" })

const fileField = zod
  .file({ message: "fileRequired" })
  .min(MIN_FIELD_LENGTH, { message: "fileRequired" })
  .max(LESSON_ATTACHMENT_MAX_BYTES, { message: "fileTooLarge" })
  .transform((file, context) => {
    const contentType = attachmentContentType(file.name)
    if (contentType === undefined) {
      context.addIssue({ code: "custom", input: file, message: "fileTypeUnsupported" })
      return zod.NEVER
    }

    return { contentType, file, fileName: attachmentFileName(file.name) }
  })

const createLessonAttachment = zod.object({
  lessonId: idField,
  title: localizedTextSchema,
  url: linkField,
})

const deleteLessonAttachment = attachmentIdInput

const moveLessonAttachment = attachmentIdInput.extend({ direction: zod.enum(MOVE_DIRECTIONS) })

const updateLessonAttachment = attachmentIdInput.extend({ title: localizedTextSchema, url: linkField.optional() })

const uploadLessonAttachment = zod
  .instanceof(FormData)
  .transform((form) => uploadEntries(form, I18N.SUPPORTED_LOCALES))
  .pipe(
    zod.object({
      file: fileField,
      lessonId: idField,
      title: localizedTextSchema,
    }),
  )

export const lessonAttachmentZodSchemas = {
  createLessonAttachment,
  deleteLessonAttachment,
  moveLessonAttachment,
  updateLessonAttachment,
  uploadLessonAttachment,
}
