import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { v7 } from "uuid"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { PRODUCT_MUTATION_KEYS, PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import type { Product } from "~/src/modules/product/product.types"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const createProduct = createServerFn({ method: "POST" })
  .middleware([authorized({ product: ["create"] })])
  .validator((input: Product["createProduct"]) => productZodSchemas.createProduct.parse(input))
  .handler(({ data }) =>
    db
      .insert(product)
      .values({
        billingCycle: data.billingCycle,
        currency: data.currency ?? DEFAULT_CURRENCY_CODE,
        description: data.description ?? "",
        id: v7(),
        name: data.name,
        priceCents: data.priceCents,
        status: data.status ?? PRODUCT_STATUS.DRAFT,
        type: data.type,
      })
      .returning()
      .get(),
  )

export const createProductMutation = mutationOptions({
  mutationFn: (data: Product["createProduct"]) => createProduct({ data }),
  mutationKey: PRODUCT_MUTATION_KEYS.CREATE,
})
