import type { JSX } from "react"

import { usePagePending } from "~/src/hooks/use-page-pending"

import { COURSE_COLUMN_SIZES } from "~/src/data/admin-courses"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { FieldPending } from "~/src/presentation/components/custom/admin/pending-blocks"
import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"

const COURSE_FORM_FIELDS = ["title", "summary", "slug"] as const
const COURSE_LIST_ACTIONS = 3
const CURRICULUM_LESSONS = ["first", "second", "third"] as const

const COURSE_PENDING_COLUMNS = [
  {
    cell: (
      <div className="flex flex-col">
        <Skeleton className="h-lh w-40 scale-y-70 text-sm" />
        <Skeleton className="h-lh w-28 scale-y-70 text-spec" />
      </div>
    ),
    id: "course",
    width: COURSE_COLUMN_SIZES.course,
  },
  { cell: <Skeleton className="h-lh w-16 scale-y-70 text-sm" />, id: "kind", width: COURSE_COLUMN_SIZES.kind },
  { cell: <Skeleton className="h-5.5 w-18 rounded-md" />, id: "status", width: COURSE_COLUMN_SIZES.status },
  { cell: <Skeleton className="h-lh w-6 scale-y-70 text-sm" />, id: "lessons", width: COURSE_COLUMN_SIZES.lessons },
  { cell: <Skeleton className="h-lh w-20 scale-y-70 text-sm" />, id: "updatedAt", width: COURSE_COLUMN_SIZES.updatedAt },
] as const

export const AdminCoursesPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <AdminPageHeaderPending actions={COURSE_LIST_ACTIONS} />
    <DataGridPending actionsWidth={COURSE_COLUMN_SIZES.actions} columns={COURSE_PENDING_COLUMNS} />
  </div>
)

const CourseFormPending = (): JSX.Element => (
  <Card>
    <CardHeader>
      <Skeleton className="h-lh w-32 scale-y-70 text-base" />
    </CardHeader>
    <CardContent className="flex flex-col gap-6">
      {COURSE_FORM_FIELDS.map((field) => (
        <FieldPending key={field} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldPending />
        <FieldPending />
      </div>
    </CardContent>
  </Card>
)

export const AdminCourseCreatePending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full max-w-3xl flex-col space-y-8">
    <AdminPageHeaderPending />
    <CourseFormPending />
  </div>
)

export const AdminCourseEditorPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <AdminPageHeaderPending actions={1} />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,28rem)_1fr]">
      <div className="flex flex-col gap-6">
        <CourseFormPending />
        <Card>
          <CardHeader>
            <Skeleton className="h-lh w-24 scale-y-70 text-base" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="aspect-video w-full rounded-md" />
            <FieldPending />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-lh w-28 scale-y-70 text-base" />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border">
            <Skeleton className="h-12 w-full rounded-none" />
            <div className="px-4">
              {CURRICULUM_LESSONS.map((lesson) => (
                <div
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 gap-y-2 border-b border-border py-3 last:border-b-0"
                  key={lesson}
                >
                  <Skeleton className="h-lh w-4 scale-y-70 text-spec" />
                  <div className="flex flex-col">
                    <Skeleton className="h-lh w-3/5 scale-y-70 text-sm" />
                    <Skeleton className="mt-0.5 h-lh w-2/5 scale-y-70 text-spec" />
                  </div>
                  <div className="col-start-2 flex items-center gap-1.5">
                    <Skeleton className="h-5.5 w-24 rounded-md" />
                    <Skeleton className="h-5.5 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)

const LESSON_FORM_FIELDS = ["title", "summary", "description", "slug"] as const
const LESSON_SIDE_CARDS = ["video", "materials"] as const

export const AdminLessonEditorPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <AdminPageHeaderPending actions={1} hasBack />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <Card>
        <CardHeader>
          <Skeleton className="h-lh w-32 scale-y-70 text-base" />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {LESSON_FORM_FIELDS.map((field) => (
            <FieldPending key={field} />
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldPending />
            <FieldPending />
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-6">
        {LESSON_SIDE_CARDS.map((card) => (
          <Card key={card}>
            <CardHeader>
              <Skeleton className="h-lh w-28 scale-y-70 text-base" />
              <Skeleton className="h-lh w-64 max-w-full scale-y-70 text-sm" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
)

export const AdminCourseSectionPending = (): JSX.Element | undefined => {
  const Page = usePagePending("/admin/courses")

  return Page && <Page />
}
