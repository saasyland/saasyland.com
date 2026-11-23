import type * as zod from "zod"

import type { getVideos } from "~/src/modules/video/use-cases/get-videos"
import type { createPlayback } from "~/src/modules/video/video.playback"
import type { video } from "~/src/modules/video/video.schema"
import type { videoZodSchemas } from "~/src/modules/video/video.zod"

export interface Video {
  select: typeof video.$inferSelect
  insert: typeof video.$inferInsert
  playback: Awaited<ReturnType<typeof createPlayback>>
  libraryVideo: Awaited<ReturnType<typeof getVideos>>["rows"][number]
  deleteVideo: zod.input<typeof videoZodSchemas.deleteVideo>
  getVideoPlayback: zod.input<typeof videoZodSchemas.getVideoPlayback>
  getVideos: zod.input<typeof videoZodSchemas.getVideos>
  registerVideo: zod.input<typeof videoZodSchemas.registerVideo>
}
