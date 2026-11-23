import * as zod from "zod"

import { MIN_FIELD_LENGTH, idField } from "~/src/modules/_core/utils/zod-fields"
import { attachmentFileName } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import {
  VIDEO_UPLOAD_FILE_TYPES,
  VIDEO_UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_MAX_PARTS,
  VIDEO_UPLOAD_PART_BYTES,
} from "~/src/modules/video-upload/video-upload.constants"
import { partEntries, videoUploadExtension } from "~/src/modules/video-upload/video-upload.files"

const uploadIdInput = zod.object({
  uploadId: idField,
})

const videoFileName = zod
  .string()
  .trim()
  .min(MIN_FIELD_LENGTH, { message: "fileRequired" })
  .transform((name, context) => {
    const extension = videoUploadExtension(name)
    if (extension === undefined) {
      context.addIssue({ code: "custom", input: name, message: "videoTypeUnsupported" })
      return zod.NEVER
    }

    return { contentType: VIDEO_UPLOAD_FILE_TYPES[extension].contentType, extension, fileName: attachmentFileName(name) }
  })

const startVideoUpload = zod.object({
  fileName: videoFileName,
  lastModified: zod.int().nonnegative(),
  lessonId: idField,
  sizeBytes: zod.int().min(MIN_FIELD_LENGTH, { message: "fileRequired" }).max(VIDEO_UPLOAD_MAX_BYTES, { message: "videoTooLarge" }),
})

const videoPart = zod.object({
  part: zod.file().min(MIN_FIELD_LENGTH).max(VIDEO_UPLOAD_PART_BYTES),
  partNumber: zod.coerce.number().int().min(MIN_FIELD_LENGTH).max(VIDEO_UPLOAD_MAX_PARTS),
  uploadId: idField,
})

const uploadVideoPart = zod.instanceof(FormData).transform((form) => videoPart.parse(partEntries(form)))

const completeVideoUpload = uploadIdInput

const cancelVideoUpload = uploadIdInput

const retryVideoUpload = uploadIdInput

export const videoUploadZodSchemas = {
  cancelVideoUpload,
  completeVideoUpload,
  retryVideoUpload,
  startVideoUpload,
  uploadVideoPart,
}
