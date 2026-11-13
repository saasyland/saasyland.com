import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { count, desc } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { VIDEO_QUERY_KEYS } from "~/src/modules/video/video.constants"
import { video } from "~/src/modules/video/video.schema"
import type { Video } from "~/src/modules/video/video.types"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

export const getVideos = createServerFn({ method: "GET" })
  .middleware([authorized({ video: ["read"] })])
  .validator((input: Video["getVideos"]) => videoZodSchemas.getVideos.parse(input))
  .handler(async ({ data }) => {
    const [rows, totals] = await db.batch([
      db
        .select()
        .from(video)
        .orderBy(desc(video.createdAt), desc(video.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(video),
    ])
    return { rows, total: totals.reduce((sum, row) => sum + row.total, 0) }
  })

export const getVideosPageQuery = (input: Video["getVideos"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getVideos>>>({
    queryFn: () => getVideos({ data: input }),
    queryKey: [...VIDEO_QUERY_KEYS.LIST, videoZodSchemas.getVideos.parse(input)],
  })

export const getVideosQuery = getVideosPageQuery()
