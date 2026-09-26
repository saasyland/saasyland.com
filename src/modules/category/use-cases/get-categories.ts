import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { count, desc, eq } from "drizzle-orm"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { CATEGORY_QUERY_KEYS } from "~/src/modules/category/category.constants"
import { CATEGORY_KINDS, category } from "~/src/modules/category/category.schema"

export const listCategoriesSchema = paginationSchema.extend({
  kind: zod.enum(CATEGORY_KINDS).optional(),
})

export const getCategories = createServerFn({ method: "GET" })
  .middleware([authorized({ category: ["read"] })])
  .validator((input: zod.input<typeof listCategoriesSchema>) => listCategoriesSchema.parse(input))
  .handler(async ({ data }) => {
    const filter = data.kind === undefined ? undefined : eq(category.kind, data.kind)
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

export const getCategoriesPageQuery = (input: zod.input<typeof listCategoriesSchema> = {}) =>
  queryOptions<Awaited<ReturnType<typeof getCategories>>>({
    queryFn: () => getCategories({ data: input }),
    queryKey: [...CATEGORY_QUERY_KEYS.LIST, listCategoriesSchema.parse(input)],
  })

export const getCategoriesQuery = getCategoriesPageQuery()
