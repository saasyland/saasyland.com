import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { getCoursesPageQuery, getCoursesQuery } from "~/src/modules/course/use-cases/get-courses"
import { moveCourseMutation } from "~/src/modules/course/use-cases/move-course"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { pageHead } from "~/src/lib/seo"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminCoursesPending } from "~/src/presentation/components/custom/admin/courses-pending"
import { COURSE_GRID_ID, CourseActions, useCourseColumns } from "~/src/presentation/components/custom/admin/courses/course-columns"
import { DeleteCoursesButton } from "~/src/presentation/components/custom/admin/courses/delete-courses-dialog"
import { ExportCoursesButton } from "~/src/presentation/components/custom/admin/courses/export-courses-button"
import { ImportCoursesDialog } from "~/src/presentation/components/custom/admin/courses/import-courses-dialog"
import { DataGrid } from "~/src/presentation/components/custom/data-grid"

import * as ROUTES from "~/src/routes"

const COURSE_ORDER_SCOPE = { id: COURSE_GRID_ID }

const CoursesPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const columns = useCourseColumns()

  const move = useMutation({
    ...moveCourseMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
    scope: COURSE_ORDER_SCOPE,
  })

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <AdminPageHeader
        actions={
          <>
            <ImportCoursesDialog />
            <ExportCoursesButton />
            <LinkButton className="h-9 gap-2" to={ROUTES.ADMIN_COURSES_CREATE} size="sm">
              <PlusCircle aria-hidden className="size-4" />
              {t("actions.create")}
            </LinkButton>
          </>
        }
        description={t("description")}
        title={t("title")}
      />

      <DataGrid
        bulkActions={(rows) => <DeleteCoursesButton courses={rows} />}
        columns={columns}
        empty={t("table.empty")}
        emptyDescription={t("table.emptyDescription")}
        id={COURSE_GRID_ID}
        label={t("title")}
        onReorder={({ offset, row }) => move.mutateAsync({ courseId: row.id, offset })}
        query={(request) => getCoursesPageQuery(courseZodSchemas.getCourses.parse(request))}
        rowActions={CourseActions}
        search={t("table.search")}
        selectable
      />
    </div>
  )
}

const NAMESPACE = "pages.admin.courses"

export const Route = createFileRoute("/admin/courses/")({
  component: CoursesPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getCoursesQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.ADMIN_COURSES),
  pendingComponent: AdminCoursesPending,
  staticData: { namespaces: [NAMESPACE] },
})
