import { describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { breadcrumbDividers } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import {
  AdminCourseCreatePending,
  AdminCourseEditorPending,
  AdminCourseSectionPending,
  AdminCoursesPending,
  AdminLessonEditorPending,
} from "~/src/presentation/components/custom/admin/courses-pending"

import { routeTree } from "~/src/routeTree.gen"

const COURSE_ID = "01960000-0000-7000-8000-00000000c001"

describe("admin course skeletons", () => {
  it.each([
    ["/admin/courses", AdminPending, AdminCoursesPending],
    ["/admin/courses/create", AdminPending, AdminCourseCreatePending],
    ["/admin/courses", AdminCourseSectionPending, AdminCoursesPending],
    ["/pl-PL/admin/courses/create", AdminCourseSectionPending, AdminCourseCreatePending],
    [`/admin/courses/${COURSE_ID}`, AdminCourseSectionPending, AdminCourseEditorPending],
    [`/admin/courses/${COURSE_ID}/lessons/lesson-sessions`, AdminCourseSectionPending, AdminLessonEditorPending],
  ])("renders the skeleton of the page at %s", (path, Layout, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<Layout />, { router: createTestRouter(path, routeTree) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("draws the breadcrumb trail of /admin/courses/create", () => {
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/courses/create", routeTree) })

    expect(breadcrumbDividers(container)).toHaveLength(2)
  })
})
