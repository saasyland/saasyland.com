import zod from "zod/v4"

export const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGINATION = { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }

export const paginationSchema = zod.object({
  pageIndex: zod.int().nonnegative().default(0),
  pageSize: zod.int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})
