import { describe, expect, it } from "vite-plus/test"

import { DEFAULT_PAGE_SIZE, paginationSchema } from "~/src/modules/_core/utils/pagination"

describe("list pagination boundary", () => {
  it("defaults to a bounded first page", () => {
    expect(paginationSchema.parse({})).toEqual({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })
  })
  it.each([{ pageIndex: -1 }, { pageIndex: 0.5 }, { pageSize: 0 }, { pageSize: 101 }, { pageSize: 1.5 }, { pageSize: "10" }])(
    "rejects invalid pagination: %j",
    (input) => {
      expect(paginationSchema.safeParse(input).success).toBe(false)
    },
  )
})
