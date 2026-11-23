import {
  VIDEO_UPLOAD_FILE_TYPES,
  VIDEO_UPLOAD_KEY_PREFIX,
  VIDEO_UPLOAD_SOURCE_NAME,
  type VideoUploadExtension,
} from "~/src/modules/video-upload/video-upload.constants"

const EXTENSION_SEPARATOR = "."

export const PART_FIELDS = {
  PART: "part",
  PART_NUMBER: "partNumber",
  UPLOAD_ID: "uploadId",
} as const

const isVideoExtension = (extension: string): extension is VideoUploadExtension => Object.hasOwn(VIDEO_UPLOAD_FILE_TYPES, extension)

export const videoUploadExtension = (fileName: string): VideoUploadExtension | undefined => {
  const extension = fileName.slice(fileName.lastIndexOf(EXTENSION_SEPARATOR) + 1).toLowerCase()

  return isVideoExtension(extension) ? extension : undefined
}

export const videoTitle = (fileName: string): string => {
  const separator = fileName.lastIndexOf(EXTENSION_SEPARATOR)

  return separator > 0 ? fileName.slice(0, separator) : fileName
}

export const videoUploadObjectKey = ({ extension, uploadId }: { readonly extension: string; readonly uploadId: string }): string =>
  `${VIDEO_UPLOAD_KEY_PREFIX}/${uploadId}/${VIDEO_UPLOAD_SOURCE_NAME}.${extension}`

export const uploadPartCount = ({ partBytes, sizeBytes }: { readonly partBytes: number; readonly sizeBytes: number }): number =>
  Math.ceil(sizeBytes / partBytes)

export const uploadPartLength = ({
  partBytes,
  partNumber,
  sizeBytes,
}: {
  readonly partBytes: number
  readonly partNumber: number
  readonly sizeBytes: number
}): number => Math.min(partBytes, sizeBytes - (partNumber - 1) * partBytes)

export const uploadedBytes = ({
  partBytes,
  parts,
  sizeBytes,
}: {
  readonly partBytes: number
  readonly parts: Readonly<Record<string, string>>
  readonly sizeBytes: number
}): number =>
  Object.keys(parts).reduce((total, partNumber) => total + uploadPartLength({ partBytes, partNumber: Number(partNumber), sizeBytes }), 0)

export const partFormData = ({
  part,
  partNumber,
  uploadId,
}: {
  readonly part: Blob
  readonly partNumber: number
  readonly uploadId: string
}) => {
  const form = new FormData()
  form.set(PART_FIELDS.UPLOAD_ID, uploadId)
  form.set(PART_FIELDS.PART_NUMBER, String(partNumber))
  form.set(PART_FIELDS.PART, part)

  return form
}

export const partEntries = (form: FormData) => ({
  part: form.get(PART_FIELDS.PART),
  partNumber: form.get(PART_FIELDS.PART_NUMBER),
  uploadId: form.get(PART_FIELDS.UPLOAD_ID),
})
