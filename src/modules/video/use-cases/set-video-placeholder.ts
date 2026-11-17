import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { VIDEO_MUTATION_KEYS } from "~/src/modules/video/video.constants"
import { video } from "~/src/modules/video/video.schema"
import type { Video } from "~/src/modules/video/video.types"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

export const setVideoPlaceholder = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Video["setVideoPlaceholder"]) => videoZodSchemas.setVideoPlaceholder.parse(input))
  .handler(async ({ data: { placeholder, videoId } }) => {
    const [row] = await db
      .update(video)
      .set({ placeholder })
      .where(eq(video.id, videoId))
      .returning({ id: video.id, placeholder: video.placeholder })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const setVideoPlaceholderMutation = mutationOptions({
  mutationFn: (data: Video["setVideoPlaceholder"]) => setVideoPlaceholder({ data }),
  mutationKey: VIDEO_MUTATION_KEYS.SET_PLACEHOLDER,
})
