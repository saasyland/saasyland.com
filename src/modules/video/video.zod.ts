import zod from "zod/v4"

import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { MIN_FIELD_LENGTH, idField, localeField } from "~/src/modules/_core/utils/zod-fields"
import { VIDEO_TITLE_MAX_LENGTH } from "~/src/modules/video/video.constants"

const videoIdInput = zod.object({
  videoId: idField,
})

const deleteVideo = videoIdInput

const getVideoPlayback = videoIdInput

const getVideos = paginationSchema

const registerVideo = zod.object({
  captionLocales: zod.array(localeField),
  durationMs: zod.int().positive(),
  height: zod.int().positive(),
  id: zod.uuid(),
  sizeBytes: zod.int().positive(),
  title: zod.string().trim().min(MIN_FIELD_LENGTH).max(VIDEO_TITLE_MAX_LENGTH),
  width: zod.int().positive(),
})

export const videoZodSchemas = {
  deleteVideo,
  getVideoPlayback,
  getVideos,
  registerVideo,
}
