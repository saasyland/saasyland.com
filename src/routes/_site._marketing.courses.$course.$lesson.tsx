import { type JSX, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute, isNotFound } from "@tanstack/react-router"
import { AlignLeft, ArrowLeft, ArrowRight, Check, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type { Course } from "~/src/modules/course/course.types"
import { courseLessons, coursePath, courseShareImage, isAvailable, isOpenToVisitors, isPlayable } from "~/src/modules/course/course.utils"
import type { Lesson as LessonDetail } from "~/src/modules/lesson/lesson.types"
import { lessonQuery } from "~/src/modules/lesson/use-cases/get-lesson"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

import { useLessonProgress } from "~/src/hooks/use-lesson-progress"

import { cn } from "~/src/lib/cn"
import { notFoundHead, rethrowAsNotFound } from "~/src/lib/not-found"
import { ROBOTS, buildPageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { CourseContents, CourseContentsSheet } from "~/src/presentation/components/custom/courses/course-contents"
import { LessonPending } from "~/src/presentation/components/custom/courses/courses-pending"
import { KeyMoments } from "~/src/presentation/components/custom/courses/key-moments"
import { LessonMedia } from "~/src/presentation/components/custom/courses/lesson-media"
import { LessonMeta } from "~/src/presentation/components/custom/courses/lesson-meta"
import { LessonStage } from "~/src/presentation/components/custom/courses/lesson-stage"
import { LessonTranscript } from "~/src/presentation/components/custom/courses/lesson-transcript"
import { MaterialsList } from "~/src/presentation/components/custom/courses/materials-list"
import { RichText } from "~/src/presentation/components/custom/rich-text"

import { ROUTES } from "~/src/routes"

const NEIGHBOUR_LINK_CLASSNAME =
  "group flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-border p-4 transition-colors duration-200 ease-exp hover:border-ring/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const TOC_LINK_CLASSNAME =
  "rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const TOC_MIN_ENTRIES = 2

const SECTION_IDS = { DESCRIPTION: "lesson-description", KEY_MOMENTS: "lesson-key-moments", MATERIALS: "lesson-materials" } as const

type Lesson = Course["pageLesson"]

const CompletionControl = ({ lesson }: { readonly lesson: Lesson }): JSX.Element => {
  const t = useTranslations("pages.courses.lesson")

  const { complete } = useLessonProgress({ enabled: true, lessonId: lesson.id })

  if (lesson.completed) {
    return (
      <p className="inline-flex h-8 items-center gap-2 text-spec text-ring">
        <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
        {t("completed")}
      </p>
    )
  }

  return (
    <Button onPress={complete} size="sm" variant="outline">
      <Check aria-hidden className="size-3.5" />
      {t("markComplete")}
    </Button>
  )
}

const NeighbourLink = ({
  courseSlug,
  direction,
  lesson,
}: {
  readonly courseSlug: string
  readonly direction: "next" | "previous"
  readonly lesson: Lesson
}) => {
  const t = useTranslations("pages.courses.lesson")

  return (
    <Link className={NEIGHBOUR_LINK_CLASSNAME} params={{ course: courseSlug, lesson: lesson.slug }} to="/courses/$course/$lesson">
      <span
        className={cn("inline-flex items-center gap-1.5 text-label text-muted-foreground uppercase", {
          "self-end": direction === "next",
        })}
      >
        {direction === "previous" && <ArrowLeft aria-hidden className="size-3" />}
        {t(direction)}
        {direction === "next" && <ArrowRight aria-hidden className="size-3" />}
      </span>
      <span className={cn("truncate text-body-sm text-foreground", { "text-right": direction === "next" })}>{lesson.title}</span>
    </Link>
  )
}

const UpNext = ({ courseSlug, lesson }: { readonly courseSlug: string; readonly lesson: Lesson }): JSX.Element => {
  const t = useTranslations("pages.courses.lesson")

  return (
    <Link
      className="group inline-flex h-8 max-w-full min-w-0 items-center gap-2 rounded-md px-3 text-body-sm font-medium text-foreground transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      params={{ course: courseSlug, lesson: lesson.slug }}
      to="/courses/$course/$lesson"
    >
      <span className="max-sm:hidden">{t("upNext")}</span>{" "}
      <span className="min-w-0 truncate sm:font-normal sm:text-muted-foreground">{lesson.title}</span>
      <ArrowRight
        aria-hidden
        className="size-3.5 shrink-0 transition-transform duration-200 ease-exp motion-safe:group-hover:translate-x-0.5"
      />
    </Link>
  )
}

const OnThisPage = ({ lesson }: { readonly lesson: LessonDetail["detail"] }): JSX.Element | false => {
  const t = useTranslations("pages.courses.lesson")
  const entries = [
    ...(lesson.description.length > 0 ? [{ id: SECTION_IDS.DESCRIPTION, label: t("about") }] : []),
    ...(lesson.keyMoments.length > 0 ? [{ id: SECTION_IDS.KEY_MOMENTS, label: t("keyMoments") }] : []),
    ...(lesson.attachments.length > 0 ? [{ id: SECTION_IDS.MATERIALS, label: t("materials.title") }] : []),
  ]

  return (
    entries.length >= TOC_MIN_ENTRIES && (
      <nav
        aria-label={t("onThisPage")}
        className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3 text-body-sm"
      >
        <span className="inline-flex items-center gap-2 text-foreground">
          <AlignLeft aria-hidden className="size-3.5" />
          {t("onThisPage")}
        </span>
        {entries.map((entry) => (
          <a className={TOC_LINK_CLASSNAME} href={`#${entry.id}`} key={entry.id}>
            {entry.label}
          </a>
        ))}
      </nav>
    )
  )
}

const LessonPage = (): JSX.Element => {
  const t = useTranslations("pages.courses")
  const locale = getCurrentLocale()
  const params = Route.useParams()
  const [isSidebarOpen, setSidebarOpen] = useState(true)

  const { data } = useSuspenseQuery(lessonQuery({ courseSlug: params.course, lessonSlug: params.lesson, locale }))

  const { lesson, next, previous } = data
  const playable = isPlayable(lesson)
  const number = courseLessons(data).findIndex((entry) => entry.id === lesson.id) + 1

  return (
    <section className="relative">
      <div
        className={cn("mx-auto grid w-full max-w-site gap-8 px-4 pt-6 pb-20 md:px-6 md:pt-8 xl:gap-10", {
          "lg:grid-cols-[18rem_minmax(0,1fr)]": isSidebarOpen,
        })}
      >
        <aside
          className={cn(
            "self-start max-lg:hidden lg:sticky lg:top-[calc(var(--spacing-header)+var(--spacing)*6)] lg:max-h-[calc(100dvh-var(--spacing-header)-var(--spacing)*12)] lg:overflow-y-auto lg:overscroll-contain",
            { "lg:hidden": !isSidebarOpen },
          )}
          id="lesson-sidebar"
        >
          <CourseContents currentSlug={lesson.slug} data={data} />
        </aside>

        <LessonMedia courseSlug={data.course.slug} lesson={lesson}>
          <div className="min-w-0">
            <LessonStage course={data.course} lesson={lesson} number={number} viewer={data.viewer} />

            <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <Button
                aria-controls="lesson-sidebar"
                aria-expanded={isSidebarOpen}
                className="max-lg:hidden"
                onPress={() => {
                  setSidebarOpen((open) => !open)
                }}
                size="sm"
                variant="ghost"
              >
                {isSidebarOpen && <PanelLeftClose aria-hidden className="size-3.5" />}
                {!isSidebarOpen && <PanelLeftOpen aria-hidden className="size-3.5" />}
                {isSidebarOpen ? t("lesson.hideContents") : t("lesson.showContents")}
              </Button>
              <div className="lg:hidden">
                <CourseContentsSheet currentSlug={lesson.slug} data={data} key={lesson.slug} />
              </div>
              <div className="ml-auto flex min-w-0 items-center gap-2">
                {data.viewer.signedIn && isAvailable(lesson) && <CompletionControl lesson={lesson} />}
                {next !== undefined && <UpNext courseSlug={data.course.slug} lesson={next} />}
              </div>
            </div>

            <article className="mx-auto max-w-3xl pt-10">
              <h1 className="text-headline-peak text-balance text-foreground">{lesson.title}</h1>
              <LessonMeta className="mt-4" lesson={lesson} />
              <OnThisPage lesson={lesson} />
              <p className="mt-6 text-lead text-pretty text-muted-foreground">{lesson.summary}</p>
              {lesson.description.length > 0 && (
                <div className="mt-6" id={SECTION_IDS.DESCRIPTION}>
                  <RichText className="text-body text-pretty text-muted-foreground" text={lesson.description} />
                </div>
              )}

              <KeyMoments moments={lesson.keyMoments} playable={playable} />
              {playable && lesson.captionLocales.length > 0 && <LessonTranscript courseSlug={data.course.slug} lessonSlug={lesson.slug} />}
              {lesson.attachments.length > 0 && <MaterialsList attachments={lesson.attachments} />}

              <nav aria-label={t("lesson.neighbours")} className="mt-14 flex flex-col gap-3 sm:flex-row">
                {previous !== undefined && <NeighbourLink courseSlug={data.course.slug} direction="previous" lesson={previous} />}
                {next !== undefined && <NeighbourLink courseSlug={data.course.slug} direction="next" lesson={next} />}
              </nav>
            </article>
          </div>
        </LessonMedia>
      </div>
    </section>
  )
}

const NAMESPACE = "pages.courses"

export const Route = createFileRoute("/_site/_marketing/courses/$course/$lesson")({
  component: LessonPage,
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [data] = await Promise.all([
      context.queryClient.query(lessonQuery({ courseSlug: params.course, lessonSlug: params.lesson, locale })).catch(rethrowAsNotFound),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    const { lesson } = data
    if (isPlayable(lesson)) {
      await context.queryClient.query(lessonPlaybackQuery({ courseSlug: params.course, lessonSlug: params.lesson }))
    }
    return {
      course: { cover: data.course.cover, title: data.course.title },
      locale,
      pathname: `${coursePath(data.course.slug)}/${lesson.slug}`,
      summary: lesson.summary,
      title: `${lesson.title} · ${data.course.title}`,
      ...(isOpenToVisitors(lesson) ? {} : { robots: ROBOTS.NOINDEX }),
    }
  },
  head: ({ loaderData, match }) => {
    if (isNotFound(match.error)) {
      return notFoundHead(getCurrentLocale())
    }

    return buildPageHead({
      description: loaderData?.summary,
      image: loaderData && courseShareImage(loaderData.course),
      locale: loaderData?.locale,
      pathname: loaderData?.pathname ?? ROUTES.COURSES,
      robots: loaderData?.robots,
      title: loaderData?.title,
    })
  },
  pendingComponent: LessonPending,
  staticData: { namespaces: [NAMESPACE] },
})
