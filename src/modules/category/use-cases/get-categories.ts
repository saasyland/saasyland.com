import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { type SQL, and, asc, count, desc } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { anyContains, equalTo, oneOf, withinDates } from "~/src/integrations/drizzle-orm/drizzle.search"

import { CATEGORY_QUERY_KEYS } from "~/src/modules/category/category.constants"
import { category } from "~/src/modules/category/category.schema"
import type { Category } from "~/src/modules/category/category.types"
import { categoryZodSchemas } from "~/src/modules/category/category.zod"

const sortColumns = {
  createdAt: category.createdAt,
  name: category.name,
  updatedAt: category.updatedAt,
  visibility: category.visibility,
}

const NAMED = [category.name, category.description]

const matching = ({ filters, kind, search }: Category["categoryList"]): SQL | undefined =>
  and(
    ...equalTo(category.kind, kind),
    ...anyContains(NAMED, search),
    ...anyContains(NAMED, filters.name),
    ...oneOf(category.visibility, filters.visibility),
    ...withinDates(category.createdAt, filters.createdAt),
    ...withinDates(category.updatedAt, filters.updatedAt),
  )

export const getCategories = createServerFn({ method: "GET" })
  .middleware([authorized({ category: ["read"] })])
  .validator((input: Category["getCategories"]) => categoryZodSchemas.getCategories.parse(input))
  .handler(async ({ data }) => {
    const filter = matching(data)
    const [rows, totals] = await db.batch([
      db
        .select()
        .from(category)
        .where(filter)
        .orderBy(...data.sorting.map((sort) => (sort.desc ? desc : asc)(sortColumns[sort.id])), desc(category.createdAt), desc(category.id))
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
