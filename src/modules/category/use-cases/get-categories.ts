import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { count, desc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { CATEGORY_QUERY_KEYS } from "~/src/modules/category/category.constants"
import { category } from "~/src/modules/category/category.schema"
import type { Category } from "~/src/modules/category/category.types"
import { categoryZodSchemas } from "~/src/modules/category/category.zod"

export const getCategories = createServerFn({ method: "GET" })
  .middleware([authorized({ category: ["read"] })])
  .validator((input: Category["getCategories"]) => categoryZodSchemas.getCategories.parse(input))
  .handler(async ({ data }) => {
    const filter = data.kind && eq(category.kind, data.kind)
    const [rows, totals] = await db.batch([
      db
        .select()
        .from(category)
        .where(filter)
        .orderBy(desc(category.createdAt), desc(category.id))
        .limit(data.pageSize)
        .offset(data.pageIndex * data.pageSize),
      db.select({ total: count() }).from(category).where(filter),
    ])
    return { rows, total: totals.reduce((sum, row) => sum + row.total, 0) }
  })

export const getCategoriesPageQuery = (input: Category["getCategories"] = {}) =>
  queryOptions<Awaited<ReturnType<typeof getCategories>>>({
    queryFn: () => getCategories({ data: input }),
    queryKey: [...CATEGORY_QUERY_KEYS.LIST, categoryZodSchemas.getCategories.parse(input)],
  })

export const getCategoriesQuery = getCategoriesPageQuery()
