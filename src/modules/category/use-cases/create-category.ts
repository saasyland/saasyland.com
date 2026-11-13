import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { v7 } from "uuid"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CATEGORY_ICON, CATEGORY_MUTATION_KEYS, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import { category } from "~/src/modules/category/category.schema"
import type { Category } from "~/src/modules/category/category.types"
import { categoryZodSchemas } from "~/src/modules/category/category.zod"

export const createCategory = createServerFn({ method: "POST" })
  .middleware([authorized({ category: ["create"] })])
  .validator((input: Category["createCategory"]) => categoryZodSchemas.createCategory.parse(input))
  .handler(({ data }) =>
    db
      .insert(category)
      .values({
        description: data.description ?? "",
        icon: data.icon ?? CATEGORY_ICON.FOLDER_OPEN,
        id: v7(),
        kind: data.kind,
        name: data.name,
        visibility: data.visibility ?? CATEGORY_VISIBILITY.PUBLIC,
      })
      .returning()
      .get(),
  )

export const createCategoryMutation = mutationOptions({
  mutationFn: (data: Category["createCategory"]) => createCategory({ data }),
  mutationKey: CATEGORY_MUTATION_KEYS.CREATE,
})
