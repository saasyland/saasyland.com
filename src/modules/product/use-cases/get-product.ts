import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import type zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { product } from "~/src/modules/product/product.schema"
import { productZodSchemas } from "~/src/modules/product/product.zod"

const SINGLE_ROW_LIMIT = 1

export const getProduct = createServerFn({ method: "GET" })
  .middleware([authorized({ product: ["read"] })])
  .validator((input: zod.input<typeof productZodSchemas.getProduct.shape.productId>) =>
    productZodSchemas.getProduct.shape.productId.parse(input),
  )
  .handler(async ({ data: productId }) => {
    const [row] = await db.select().from(product).where(eq(product.id, productId)).limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })
