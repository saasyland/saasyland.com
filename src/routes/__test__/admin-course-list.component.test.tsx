import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { MAX_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { COURSE_KIND, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { getCoursesPageQuery, getCoursesQuery } from "~/src/modules/course/use-cases/get-courses"

import { Route as CoursesRoute } from "~/src/routes/admin.courses.index"

import * as download from "~/src/lib/download"

import { adminQueryClient, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"

import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import coursesMessages from "~/messages/en-US/pages.admin.courses.json"

const UPDATED_AT = new Date("2026-11-20T09:30:00.000Z")

const ROWS = [
  {
    id: "01960000-0000-7000-8000-00000000c001",
    kind: COURSE_KIND.COURSE,
    lessons: 2,
    position: 1,
    slug: "the-walkthrough",
    status: COURSE_STATUS.PUBLISHED,
    title: { "en-US": "The walkthrough" },
    updatedAt: UPDATED_AT,
  },
  {
    id: "01960000-0000-7000-8000-00000000c002",
    kind: COURSE_KIND.TUTORIAL,
    lessons: 0,
    position: 2,
    slug: "one-off",
    status: COURSE_STATUS.DRAFT,
    title: { "en-US": "One-off tutorial" },
    updatedAt: UPDATED_AT,
  },
]

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("admin course grid", () => {
  it("exports the courses with their place, path, type, status, lessons and the moment they changed", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    const queryClient = adminQueryClient()
    queryClient.setQueryData(getCoursesQuery.queryKey, { rows: ROWS, total: ROWS.length })
    queryClient.setQueryData(getCoursesPageQuery({ pageSize: MAX_PAGE_SIZE }).queryKey, { rows: ROWS, total: ROWS.length })
    renderAdminPage(CoursesRoute.options.component, { path: "/admin/courses", queryClient })

    await userEvent.click(screen.getByRole("button", { name: gridMessages.toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    const { headers } = coursesMessages.table
    const { kinds, statuses } = coursesMessages.form
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.replace("﻿", "").split("\r\n").slice(0, 3)).toStrictEqual([
      [headers.position, headers.course, headers.kind, headers.status, headers.lessons, headers.updated].join(","),
      `1,The walkthrough (/courses/the-walkthrough),${kinds.course},${statuses.published},2,${UPDATED_AT.toISOString()}`,
      `2,One-off tutorial (/courses/one-off),${kinds.tutorial},${statuses.draft},0,${UPDATED_AT.toISOString()}`,
    ])
  })
})
