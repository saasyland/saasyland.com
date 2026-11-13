import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type { Course } from "~/src/modules/course/course.types"
import { courseLessons, locateLesson } from "~/src/modules/course/course.utils"
import { courseQuery } from "~/src/modules/course/use-cases/get-course"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

import { useLessonProgress } from "~/src/hooks/use-lesson-progress"

import { rethrowAsNotFound } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { LessonPending } from "~/src/presentation/components/custom/courses/courses-pending"
import { Curriculum } from "~/src/presentation/components/custom/courses/curriculum"
import { LessonPlayer } from "~/src/presentation/components/custom/courses/lesson-player"
import { LockedLesson } from "~/src/presentation/components/custom/courses/locked-lesson"
import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import { ROUTES } from "~/src/routes"

const NEIGHBOUR_LINK_CLASSNAME =
  "group flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-border p-4 transition-colors duration-200 ease-exp hover:border-ring/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

type Lesson = Course["pageLesson"]

interface LessonStageProps {
  readonly courseSlug: string
  readonly lesson: Lesson
  readonly signedIn: boolean
}

const LessonStage = ({ courseSlug, lesson, signedIn }: LessonStageProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson")

  if (lesson.locked) {
    return <LockedLesson access={lesson.access} signedIn={signedIn} />
  }

  if (lesson.durationMs === null) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-card px-6 text-center text-body text-muted-foreground">
        {t("noVideo")}
      </div>
    )
  }

  return <LessonPlayer courseSlug={courseSlug} lesson={lesson} signedIn={signedIn} />
}

const CompletionControl = ({ lesson }: { readonly lesson: Lesson }): JSX.Element => {
  const t = useTranslations("pages.courses.lesson")

  const { complete } = useLessonProgress({ enabled: true, lessonId: lesson.id })

  if (lesson.completed) {
    return (
      <p className="inline-flex items-center gap-2 font-mono text-spec text-ring">
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
      <span className="inline-flex items-center gap-1.5 font-mono text-label text-muted-foreground uppercase">
        {direction === "previous" && <ArrowLeft aria-hidden className="size-3" />}
        {t(direction)}
        {direction === "next" && <ArrowRight aria-hidden className="size-3" />}
      </span>
      <span className="truncate text-body-sm text-foreground">{lesson.title}</span>
    </Link>
  )
}

const LessonPage = (): JSX.Element => {
  const t = useTranslations("pages.courses")
  const locale = getCurrentLocale()
  const params = Route.useParams()

  const { data } = useSuspenseQuery(courseQuery({ locale, slug: params.course }))

  const { lesson, next, previous } = locateLesson(courseLessons(data), params.lesson)

  if (lesson === undefined) {
    return <DefaultNotFound />
  }

  return (
    <section className="relative">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-12 md:px-10 md:py-16 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <LessonStage courseSlug={data.course.slug} lesson={lesson} signedIn={data.viewer.signedIn} />

          <Link
            className="mt-8 inline-flex items-center gap-2 rounded-md font-mono text-label text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            params={{ course: data.course.slug }}
            to="/courses/$course"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            {data.course.title}
          </Link>
          <h1 className="mt-3 text-headline-support text-balance text-foreground">{lesson.title}</h1>
          <p className="mt-2 font-mono text-label text-ring uppercase">{t(`access.${lesson.access}`)}</p>
          <p className="mt-4 max-w-[68ch] text-body text-pretty text-muted-foreground">{lesson.summary}</p>

          {data.viewer.signedIn && !lesson.locked && (
            <div className="mt-6">
              <CompletionControl lesson={lesson} />
            </div>
          )}

          <nav aria-label={t("lesson.contents")} className="mt-10 flex flex-col gap-3 sm:flex-row">
            {previous !== undefined && <NeighbourLink courseSlug={data.course.slug} direction="previous" lesson={previous} />}
            {next !== undefined && <NeighbourLink courseSlug={data.course.slug} direction="next" lesson={next} />}
          </nav>
        </div>

        <aside aria-labelledby="lesson-contents" className="self-start lg:sticky lg:top-8">
          <h2 className="text-title text-foreground" id="lesson-contents">
            {t("lesson.contents")}
          </h2>
          <div className="mt-6">
            <Curriculum chapters={data.chapters} courseSlug={data.course.slug} />
          </div>
        </aside>
      </div>
    </section>
  )
}

const NAMESPACE = "pages.courses"

export const Route = createFileRoute("/courses/$course/$lesson")({
  component: LessonPage,
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
      context.queryClient.query({ ...courseQuery({ locale, slug: params.course }), staleTime: "static" }).catch(rethrowAsNotFound),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    const { lesson } = locateLesson(courseLessons(data), params.lesson)
    if (lesson === undefined) {
      throw notFound()
    }
    if (!lesson.locked && lesson.durationMs !== null) {
      await context.queryClient.query(lessonPlaybackQuery({ courseSlug: params.course, lessonSlug: params.lesson }))
    }
    return {
      locale,
      pathname: `${ROUTES.COURSES}/${data.course.slug}/${lesson.slug}`,
      summary: lesson.summary,
      title: `${lesson.title} · ${data.course.title}`,
    }
  },
  pendingComponent: LessonPending,
  staticData: { namespaces: [NAMESPACE] },
})
