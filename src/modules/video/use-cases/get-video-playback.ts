import { env } from "cloudflare:workers"

import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { VIDEO_QUERY_KEYS } from "~/src/modules/video/video.constants"
import { createPlayback } from "~/src/modules/video/video.playback"
import { video } from "~/src/modules/video/video.schema"
import type { Video } from "~/src/modules/video/video.types"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

const SINGLE_ROW_LIMIT = 1

export const getVideoPlayback = createServerFn({ method: "GET" })
  .middleware([authorized({ video: ["read"] })])
  .validator((input: Video["getVideoPlayback"]) => videoZodSchemas.getVideoPlayback.parse(input))
  .handler(async ({ data: { videoId } }) => {
    const [row] = await db
      .select({ captionLocales: video.captionLocales, id: video.id })
      .from(video)
      .where(eq(video.id, videoId))
      .limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return createPlayback({ now: Date.now(), secret: env.AUTH_SECRET, video: row })
  })

export const videoPlaybackQuery = (input: Video["getVideoPlayback"]) =>
  queryOptions({
    queryFn: () => getVideoPlayback({ data: input }),
    queryKey: [...VIDEO_QUERY_KEYS.PLAYBACK, input.videoId],
  })
