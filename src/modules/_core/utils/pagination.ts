import zod from "zod/v4"

const PAGE_SIZE = { LARGE: 50, LARGEST: 100, MEDIUM: 25, SMALL: 10 } as const

export const PAGE_SIZES = [PAGE_SIZE.SMALL, PAGE_SIZE.MEDIUM, PAGE_SIZE.LARGE, PAGE_SIZE.LARGEST] as const

export type PageSize = (typeof PAGE_SIZES)[number]

export const DEFAULT_PAGE_SIZE = PAGE_SIZE.SMALL

export const MAX_PAGE_SIZE = PAGE_SIZE.LARGEST

export const DEFAULT_PAGINATION = { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE }

export const MAX_SORTED_COLUMNS = 3

export const SEARCH_MAX_LENGTH = 120

export const MAX_FILTER_VALUES = 100

export const paginationSchema = zod.object({
  pageIndex: zod.int().nonnegative().default(0),
  pageSize: zod.int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})
