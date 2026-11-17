import { and, eq } from "drizzle-orm"

import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

export const playableVideo = and(eq(video.id, lesson.videoId), eq(video.placeholder, false))
