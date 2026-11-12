import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { PRODUCT_MUTATION_KEYS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import type { Product } from "~/src/modules/product/product.types"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["update"] })])
  .validator((input: Product["updateProduct"]) => productZodSchemas.updateProduct.parse(input))
  .handler(async ({ data }) => {
    const { productId, ...fields } = data

    const [row] = await db.update(product).set(fields).where(eq(product.id, productId)).returning()

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "product.errors.notFound")
    }

    return row
  })

export const updateProductMutation = mutationOptions({
  mutationFn: (data: Product["updateProduct"]) => updateProduct({ data }),
  mutationKey: PRODUCT_MUTATION_KEYS.UPDATE,
})
