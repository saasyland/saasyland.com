import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { RATE_LIMIT_WINDOW_SECONDS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_MUTATION_KEYS } from "~/src/modules/course/course.constants"
import { COURSE_COVER_UPLOADS_PER_MINUTE, coverObjectKey, coverVariantKey } from "~/src/modules/course/course.cover"
import { removeCoverObjects } from "~/src/modules/course/course.objects"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"

const UPLOAD_RATE_LIMIT = { max: COURSE_COVER_UPLOADS_PER_MINUTE, window: RATE_LIMIT_WINDOW_SECONDS } as const

export const uploadCourseCover = createServerFn({ method: "POST" })
  .middleware([withRateLimit("upload-course-cover", UPLOAD_RATE_LIMIT), authorized({ course: ["update"] })])
  .validator((input: Course["uploadCourseCover"]) => courseZodSchemas.uploadCourseCover.parse(input))
  .handler(async ({ data: { contentType, courseId, extension, variants } }) => {
    const [row] = await db.select({ cover: course.cover }).from(course).where(eq(course.id, courseId)).limit(1)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const cover = coverObjectKey({ courseId, coverId: v7(), extension })

    await Promise.all(
      variants.map(({ image, width }) => env.MEDIA.put(coverVariantKey(cover, width), image, { httpMetadata: { contentType } })),
    ).catch(async (error: unknown) => {
      await removeCoverObjects(cover)
      throw error
    })

    const [updated] = await db.update(course).set({ cover }).where(eq(course.id, courseId)).returning({ cover: course.cover })

    if (updated === undefined) {
      await removeCoverObjects(cover)
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await removeCoverObjects(row.cover)

    return updated
  })

export const uploadCourseCoverMutation = mutationOptions({
  mutationFn: (data: Course["uploadCourseCover"]) => uploadCourseCover({ data }),
  mutationKey: COURSE_MUTATION_KEYS.UPLOAD_COVER,
})
