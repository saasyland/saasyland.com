import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"

import { recordHead, rethrowAsNotFound } from "~/src/lib/not-found"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminCourseEditorPending } from "~/src/presentation/components/custom/admin/courses-pending"
import { CourseCoverCard } from "~/src/presentation/components/custom/admin/courses/course-cover-card"
import { CourseForm } from "~/src/presentation/components/custom/admin/courses/course-form"
import { CurriculumEditor } from "~/src/presentation/components/custom/admin/courses/curriculum-editor"
import { ExportCoursesButton } from "~/src/presentation/components/custom/admin/courses/export-courses-button"

import { ROUTES } from "~/src/routes"

const CourseEditorPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses.editor")

  const { courseId } = Route.useParams()

  const { data } = useSuspenseQuery(courseEditorQuery({ courseId }))

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <AdminPageHeader
        actions={
          <>
            <ExportCoursesButton course={data.course} />
            {data.course.status === COURSE_STATUS.PUBLISHED && (
              <LinkButton
                className="h-9 gap-2"
                params={{ course: data.course.slug }}
                size="sm"
                target="_blank"
                to="/courses/$course"
                variant="outline"
              >
                <ExternalLink aria-hidden className="size-4" />
                {t("view")}
              </LinkButton>
            )}
          </>
        }
        description={t("description")}
        title={localize(data.course.title, getCurrentLocale())}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,28rem)_1fr]">
        <div className="flex flex-col gap-6">
          <CourseForm course={data.course} key={data.course.updatedAt.getTime()} />
          <CourseCoverCard course={data.course} />
        </div>
        <CurriculumEditor editor={data} />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/admin/courses/$courseId")({
  component: CourseEditorPage,
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const data = await context.queryClient.query(courseEditorQuery({ courseId: params.courseId })).catch(rethrowAsNotFound)
    return { locale, pathname: `${ROUTES.ADMIN.COURSES.INDEX}/${data.course.id}`, title: localize(data.course.title, locale) }
  },
  head: recordHead(ROUTES.ADMIN.COURSES.INDEX),
  pendingComponent: AdminCourseEditorPending,
})
