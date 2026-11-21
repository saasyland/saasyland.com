import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute, isNotFound } from "@tanstack/react-router"
import { ArrowLeft, Check } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type { Course } from "~/src/modules/course/course.types"
import { courseLessons } from "~/src/modules/course/course.utils"
import { courseQuery } from "~/src/modules/course/use-cases/get-course"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { notFoundHead, rethrowAsNotFound } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { Progress, ProgressLabel } from "~/src/presentation/components/shadcn/progress"

import { CourseBadges } from "~/src/presentation/components/custom/courses/course-card"
import { CourseCover } from "~/src/presentation/components/custom/courses/course-cover"
import { CourseFacts } from "~/src/presentation/components/custom/courses/course-facts"
import { CoursePanel } from "~/src/presentation/components/custom/courses/course-panel"
import { CoursePending } from "~/src/presentation/components/custom/courses/courses-pending"
import { Curriculum } from "~/src/presentation/components/custom/courses/curriculum"

import { ROUTES } from "~/src/routes"

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

const CourseList = ({ items, title }: { readonly items: readonly string[]; readonly title: string }): JSX.Element | undefined => {
  if (items.length === 0) {
    return undefined
  }

  return (
    <section className="min-w-0">
      <h2 className="text-title text-foreground">{title}</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li className="flex gap-3 text-body text-pretty text-muted-foreground" key={item}>
            <span aria-hidden className="flex h-lh shrink-0 items-center">
              <Check className="size-3.5 text-ring" strokeWidth={2.5} />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

const CoursePage = (): JSX.Element => {
  const t = useTranslations("pages.courses")
  const locale = getCurrentLocale()
  const params = Route.useParams()

  const { data } = useSuspenseQuery(courseQuery({ locale, slug: params.course }))

  const lessons = courseLessons(data)
  const facts = {
    durationMs: lessons.reduce((total, lesson) => total + (lesson.durationMs ?? 0), 0),
    lessons: lessons.length,
    previews: lessons.filter((lesson) => lesson.access === LESSON_ACCESS.PREVIEW).length,
    recorded: lessons.filter((lesson) => !lesson.recording).length,
  }

  return (
    <section className="relative isolate">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[38rem] overflow-hidden mask-b-from-20% opacity-40">
        <CourseCover className="size-full scale-110 blur-3xl" course={data.course} isDecorative sizes="10vw" />
      </div>
      <div className="mx-auto grid w-full max-w-site px-6 pt-16 pb-24 md:px-10 md:pt-24 md:pb-32 lg:grid-cols-[minmax(0,1fr)_0.75rem_23rem] lg:grid-rows-[auto_1fr] lg:gap-x-10 xl:gap-x-14">
        <header className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Link
            className="inline-flex items-center gap-2 rounded-sm text-body-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            to={ROUTES.COURSES}
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            {t("course.breadcrumb")}
          </Link>
          <CourseBadges className="mt-8" course={data.course} />
          <h1 className="mt-5 max-w-[20ch] text-display-gate text-balance text-foreground">{data.course.title}</h1>
          <p className="mt-6 max-w-2xl text-lead text-pretty text-muted-foreground">{data.course.summary}</p>
          <CourseFacts className="mt-6" course={facts} />
          {data.viewer.signedIn && <CourseProgress lessons={lessons} />}
        </header>

        <div
          aria-hidden
          className="hidden bg-[repeating-linear-gradient(135deg,var(--color-border)_0_1px,transparent_1px_7px)] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block"
        />

        <CoursePanel
          className="mt-12 lg:sticky lg:top-[calc(var(--spacing-header)+var(--spacing)*6)] lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-h-[calc(100dvh-var(--spacing-header)-var(--spacing)*12)] lg:self-start lg:overflow-y-auto lg:overscroll-contain"
          data={data}
        />

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <div className="mt-16 grid gap-10 md:grid-cols-2 md:gap-12">
            <CourseList items={data.course.outcomes} title={t("course.outcomes")} />
            <CourseList items={data.course.prerequisites} title={t("course.prerequisites")} />
          </div>

          <section aria-labelledby="course-curriculum" className="mt-16">
            <h2 className="text-headline-support text-foreground" id="course-curriculum">
              {t("course.curriculum")}
            </h2>
            <div className="mt-8">
              <Curriculum chapters={data.chapters} courseSlug={data.course.slug} signedIn={data.viewer.signedIn} />
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}

const NAMESPACE = "pages.courses"

export const Route = createFileRoute("/_site/_marketing/courses/$course/")({
  component: CoursePage,
  head: ({
    loaderData,
    match,
  }: {
    loaderData?: { locale: SupportedLocale; pathname: string; summary: string; title: string } | undefined
    match: { error: unknown }
  }) => {
    if (isNotFound(match.error)) {
      return notFoundHead(getCurrentLocale())
    }

    return buildPageHead({
      description: loaderData?.summary,
      locale: loaderData?.locale,
      pathname: loaderData?.pathname ?? ROUTES.COURSES,
      title: loaderData?.title,
    })
  },
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
