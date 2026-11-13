import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { VIDEO_MUTATION_KEYS } from "~/src/modules/video/video.constants"
import { videoDirectory } from "~/src/modules/video/video.files"
import { video } from "~/src/modules/video/video.schema"
import type { Video } from "~/src/modules/video/video.types"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

const deleteVideoObjects = async (prefix: string): Promise<void> => {
  const page = await env.MEDIA.list({ prefix })
  if (page.objects.length === 0) {
    return
  }

  await env.MEDIA.delete(page.objects.map((object) => object.key))

  if (page.truncated) {
    await deleteVideoObjects(prefix)
  }
}

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([authorized({ video: ["delete"] })])
  .validator((input: Video["deleteVideo"]) => videoZodSchemas.deleteVideo.parse(input))
  .handler(async ({ data }) => {
    const [row] = await db.delete(video).where(eq(video.id, data.videoId)).returning({ id: video.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await deleteVideoObjects(videoDirectory(row.id))

    return row
  })

export const deleteVideoMutation = mutationOptions({
  mutationFn: (data: Video["deleteVideo"]) => deleteVideo({ data }),
  mutationKey: VIDEO_MUTATION_KEYS.DELETE,
})
