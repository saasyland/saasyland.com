import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"

import { rethrowAsNotFound } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AdminCourseEditorPending } from "~/src/presentation/components/custom/admin/content-pending"
import { CourseForm } from "~/src/presentation/components/custom/admin/courses/course-form"
import { CurriculumEditor } from "~/src/presentation/components/custom/admin/courses/curriculum-editor"

import { ROUTES } from "~/src/routes"

const CourseEditorPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses.editor")

  const { courseId } = Route.useParams()

  const { data } = useSuspenseQuery(courseEditorQuery({ courseId }))

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-statement font-semibold text-foreground">{localize(data.course.title, getCurrentLocale())}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {data.course.status === COURSE_STATUS.PUBLISHED && (
          <LinkButton className="h-9 gap-2" href={`${ROUTES.COURSES}/${data.course.slug}`} size="sm" target="_blank" variant="outline">
            <ExternalLink aria-hidden className="size-4" />
            {t("view")}
          </LinkButton>
        )}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,28rem)_1fr]">
        <CourseForm course={data.course} key={data.course.updatedAt.getTime()} />
        <CurriculumEditor editor={data} />
      </div>
    </div>
  )
}

export const Route = createFileRoute("/admin/courses/$courseId")({
  component: CourseEditorPage,
  head: ({ loaderData }: { loaderData?: { locale: SupportedLocale; pathname: string; title: string } | undefined }) =>
    buildPageHead({ locale: loaderData?.locale, pathname: loaderData?.pathname ?? ROUTES.ADMIN_COURSES, title: loaderData?.title }),
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const data = await context.queryClient.query(courseEditorQuery({ courseId: params.courseId })).catch(rethrowAsNotFound)
    return { locale, pathname: `${ROUTES.ADMIN_COURSES}/${data.course.id}`, title: localize(data.course.title, locale) }
  },
  pendingComponent: AdminCourseEditorPending,
})
