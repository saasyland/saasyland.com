import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { category } from "~/src/modules/category/category.schema"
import { categoryZodSchemas } from "~/src/modules/category/category.zod"

const SINGLE_ROW_LIMIT = 1

export const getCategory = createServerFn({ method: "GET" })
  .middleware([authorized({ category: ["read"] })])
  .validator((input: zod.input<typeof categoryZodSchemas.getCategory.shape.categoryId>) =>
    categoryZodSchemas.getCategory.shape.categoryId.parse(input),
  )
  .handler(async ({ data: categoryId }) => {
    const [row] = await db.select().from(category).where(eq(category.id, categoryId)).limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })
