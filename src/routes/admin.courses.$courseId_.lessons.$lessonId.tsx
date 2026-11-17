import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { findEditorLesson } from "~/src/modules/course/course.utils"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

import { rethrowAsNotFound } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AdminLessonEditorPending } from "~/src/presentation/components/custom/admin/courses-pending"
import { LessonForm } from "~/src/presentation/components/custom/admin/courses/lesson-form"
import { LessonMaterials } from "~/src/presentation/components/custom/admin/courses/lesson-materials"
import { LessonVideoCard } from "~/src/presentation/components/custom/admin/courses/lesson-video-card"
import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import { ROUTES } from "~/src/routes"

const LessonEditorPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor")
  const locale = getCurrentLocale()

  const { courseId, lessonId } = Route.useParams()

  const { data } = useSuspenseQuery(courseEditorQuery({ courseId }))

  const lesson = findEditorLesson(data, lessonId)

  if (lesson === undefined) {
    return <DefaultNotFound />
  }

  const isPublic = data.course.status === COURSE_STATUS.PUBLISHED && lesson.status === LESSON_STATUS.PUBLISHED

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            params={{ courseId }}
            to="/admin/courses/$courseId"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {localize(data.course.title, locale)}
          </Link>
          <h1 className="mt-2 text-statement font-semibold text-foreground">{localize(lesson.title, locale)}</h1>
          <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
        </div>
        {isPublic && (
          <LinkButton
            className="h-9 gap-2"
            href={`${ROUTES.COURSES}/${data.course.slug}/${lesson.slug}`}
            size="sm"
            target="_blank"
            variant="outline"
          >
            <ExternalLink aria-hidden className="size-4" />
            {t("view")}
          </LinkButton>
        )}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <LessonForm key={lesson.id} lesson={lesson} />
        <div className="flex flex-col gap-6">
          <LessonVideoCard key={lesson.video?.id ?? lesson.id} lesson={lesson} />
          <LessonMaterials lesson={lesson} />
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/admin/courses/$courseId_/lessons/$lessonId")({
  component: LessonEditorPage,
  head: ({ loaderData }: { loaderData?: { locale: SupportedLocale; pathname: string; title: string } | undefined }) =>
    buildPageHead({ locale: loaderData?.locale, pathname: loaderData?.pathname ?? ROUTES.ADMIN_COURSES, title: loaderData?.title }),
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const data = await context.queryClient.query(courseEditorQuery({ courseId: params.courseId })).catch(rethrowAsNotFound)
    const lesson = findEditorLesson(data, params.lessonId)
    if (lesson === undefined) {
      throw notFound()
    }
    return {
      locale,
      pathname: `${ROUTES.ADMIN_COURSES}/${data.course.id}/lessons/${lesson.id}`,
      title: `${localize(lesson.title, locale)} · ${localize(data.course.title, locale)}`,
    }
  },
  pendingComponent: AdminLessonEditorPending,
})
