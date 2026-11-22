import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { cn } from "~/src/lib/cn"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  DescriptionPending,
  FieldPending,
  PAGE_ROWS,
  PaginationPending,
  TitlePending,
} from "~/src/presentation/components/custom/admin/pending-blocks"

import { ROUTES } from "~/src/routes"

const COURSE_COLUMNS = [
  { id: "course", width: "w-14" },
  { id: "kind", width: "w-10" },
  { id: "status", width: "w-12" },
  { id: "lessons", width: "w-12" },
  { id: "updated", width: "w-16" },
] as const
const COURSE_FORM_FIELDS = ["title", "summary", "slug"] as const
const CURRICULUM_LESSONS = ["first", "second", "third"] as const

export const AdminCoursesPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <DescriptionPending />
      </div>
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
    <div className="space-y-4">
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {COURSE_COLUMNS.map(({ id, width }) => (
                <TableHead key={id}>
                  <Skeleton className={cn("h-lh scale-y-70", width)} />
                </TableHead>
              ))}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAGE_ROWS.map((row) => (
              <TableRow key={row}>
                {COURSE_COLUMNS.map(({ id, width }) => (
                  <TableCell key={id}>
                    <Skeleton className={cn("h-lh scale-y-70 text-sm", width)} />
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="size-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <PaginationPending />
    </div>
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
    <div>
      <TitlePending />
      <DescriptionPending />
    </div>
    <CourseFormPending />
  </div>
)

export const AdminCourseEditorPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <TitlePending />
        <DescriptionPending />
      </div>
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Skeleton className="h-lh w-32 scale-y-70 text-sm" />
        <TitlePending />
        <DescriptionPending />
      </div>
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
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

const COURSE_PAGES = new Map<string, () => JSX.Element>([
  [ROUTES.ADMIN_COURSES, AdminCoursesPending],
  [ROUTES.ADMIN_COURSES_CREATE, AdminCourseCreatePending],
])

const LESSON_EDITOR_PATH = new RegExp(`^${ROUTES.ADMIN_COURSES}/[^/]+/lessons/[^/]+$`, "u")

const sectionPage = (pathname: string): (() => JSX.Element) => {
  if (LESSON_EDITOR_PATH.test(pathname)) {
    return AdminLessonEditorPending
  }

  return COURSE_PAGES.get(pathname) ?? AdminCourseEditorPending
}

export const AdminCourseSectionPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = sectionPage(pathname)

  return <Page />
}

const VIDEO_TITLE_COLUMN = { id: "title", width: "w-12" } as const
const VIDEO_DETAIL_COLUMNS = [
  { id: "duration", width: "w-16" },
  { id: "resolution", width: "w-20" },
  { id: "size", width: "w-10" },
  { id: "captions", width: "w-16" },
  { id: "placeholder", width: "w-8" },
  { id: "published", width: "w-18" },
] as const
const VIDEO_PUBLISH_STEPS = ["ffmpeg", "keys", "publish"] as const

const VideoRowPending = (): JSX.Element => (
  <TableRow>
    <TableCell>
      <div className="flex flex-col">
        <Skeleton className="h-lh w-40 scale-y-70 text-sm" />
        <Skeleton className="h-lh w-64 scale-y-70 text-spec" />
      </div>
    </TableCell>
    {VIDEO_DETAIL_COLUMNS.map(({ id, width }) => (
      <TableCell key={id}>
        <Skeleton className={cn("h-lh scale-y-70 text-sm", width)} />
      </TableCell>
    ))}
    <TableCell>
      <div className="flex justify-end gap-1">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="size-8 rounded-md" />
      </div>
    </TableCell>
  </TableRow>
)

export const AdminVideosPending = (): JSX.Element => (
  <div aria-busy="true" className="flex w-full flex-col space-y-8">
    <div>
      <TitlePending />
      <DescriptionPending />
    </div>
    <div className="space-y-4">
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              {[VIDEO_TITLE_COLUMN, ...VIDEO_DETAIL_COLUMNS].map(({ id, width }) => (
                <TableHead key={id}>
                  <Skeleton className={cn("h-lh scale-y-70", width)} />
                </TableHead>
              ))}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {PAGE_ROWS.map((row) => (
              <VideoRowPending key={row} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <PaginationPending />
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-lh w-36 scale-y-70 text-base" />
        <Skeleton className="h-lh w-96 max-w-full scale-y-70 text-sm" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {VIDEO_PUBLISH_STEPS.map((step) => (
            <div className="flex flex-col gap-2" key={step}>
              <Skeleton className="h-lh w-56 max-w-full scale-y-70 text-sm" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
)
