import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, Play } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type { Course } from "~/src/modules/course/course.types"
import { courseLessons, nextLessonToWatch } from "~/src/modules/course/course.utils"
import { courseQuery } from "~/src/modules/course/use-cases/get-course"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { rethrowAsNotFound } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { Progress, ProgressLabel } from "~/src/presentation/components/shadcn/progress"

import { CoursePending } from "~/src/presentation/components/custom/courses/courses-pending"
import { Curriculum } from "~/src/presentation/components/custom/courses/curriculum"
import { UnlockLink } from "~/src/presentation/components/custom/courses/locked-lesson"

import { ROUTES } from "~/src/routes"

const START_CLASSNAME =
  "mt-10 inline-flex h-11 items-center gap-2.5 rounded-lg bg-primary px-5 text-body-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 ease-exp hover:bg-primary/88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"

const CourseProgress = ({ lessons }: { readonly lessons: readonly Course["pageLesson"][] }): JSX.Element => {
  const t = useTranslations("pages.courses.course")
  const completed = lessons.filter((lesson) => lesson.completed).length

  return (
    <Progress className="mt-8 max-w-md **:data-[slot=progress-indicator]:bg-ring" maxValue={lessons.length} value={completed}>
      <ProgressLabel className="font-mono text-spec text-muted-foreground">
        {t("progress", { completed, total: lessons.length })}
      </ProgressLabel>
    </Progress>
  )
}

interface StartLinkProps {
  readonly courseSlug: string
  readonly next: Course["pageLesson"]
  readonly started: boolean
}

const StartLink = ({ courseSlug, next, started }: StartLinkProps): JSX.Element => {
  const t = useTranslations("pages.courses.course")

  return (
    <Link className={START_CLASSNAME} params={{ course: courseSlug, lesson: next.slug }} to="/courses/$course/$lesson">
      <Play aria-hidden className="size-3.5 fill-current" strokeWidth={0} />
      {started ? t("continue", { title: next.title }) : t("start")}
    </Link>
  )
}

const CoursePage = (): JSX.Element => {
  const t = useTranslations("pages.courses")
  const locale = getCurrentLocale()
  const params = Route.useParams()

  const { data } = useSuspenseQuery(courseQuery({ locale, slug: params.course }))

  const lessons = courseLessons(data)
  const next = nextLessonToWatch(lessons)
  const hasLockedLessons = lessons.some((lesson) => lesson.locked)

  return (
    <section className="relative">
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <Link
            className="inline-flex items-center gap-2 rounded-md font-mono text-label text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            to={ROUTES.COURSES}
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            {t("course.breadcrumb")}
          </Link>
          <p className="mt-8 flex items-center gap-2.5">
            <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
            <span className="font-mono text-label text-ring uppercase">{t(`kinds.${data.course.kind}`)}</span>
          </p>
          <h1 className="mt-4 max-w-[18ch] text-headline-peak text-balance text-foreground">{data.course.title}</h1>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{data.course.summary}</p>

          {data.viewer.signedIn && <CourseProgress lessons={lessons} />}
          {next !== undefined && (
            <StartLink courseSlug={data.course.slug} next={next} started={lessons.some((lesson) => lesson.completed)} />
          )}

          <div className="mt-16">
            <h2 className="text-headline-support text-foreground">{t("course.curriculum")}</h2>
            <div className="mt-8">
              <Curriculum chapters={data.chapters} courseSlug={data.course.slug} />
            </div>
          </div>
        </div>

        {hasLockedLessons && (
          <aside className="self-start rounded-xl border border-ring/30 bg-radial-[at_top] from-ring/10 to-card to-70% p-7 lg:sticky lg:top-8">
            <h2 className="text-title text-balance text-foreground">{t("course.unlock.title")}</h2>
            <p className="mt-3 text-body-sm text-pretty text-muted-foreground">{t("course.unlock.body")}</p>
            <UnlockLink access={LESSON_ACCESS.PAID} signedIn={data.viewer.signedIn} />
          </aside>
        )}
      </div>
    </section>
  )
}

const NAMESPACE = "pages.courses"

export const Route = createFileRoute("/courses/$course/")({
  component: CoursePage,
  head: ({ loaderData }: { loaderData?: { locale: SupportedLocale; pathname: string; summary: string; title: string } | undefined }) =>
    buildPageHead({
      description: loaderData?.summary,
      locale: loaderData?.locale,
      pathname: loaderData?.pathname ?? ROUTES.COURSES,
      title: loaderData?.title,
    }),
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [data] = await Promise.all([
      context.queryClient.query(courseQuery({ locale, slug: params.course })).catch(rethrowAsNotFound),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, pathname: `${ROUTES.COURSES}/${data.course.slug}`, summary: data.course.summary, title: data.course.title }
  },
  pendingComponent: CoursePending,
  staticData: { namespaces: [NAMESPACE] },
})
