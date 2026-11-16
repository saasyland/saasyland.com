import { type JSX, useRef, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowRight, Play } from "lucide-react"
import { useInView } from "motion/react"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseShowcaseQuery } from "~/src/modules/course/use-cases/get-course-showcase"

import { LANDING_VIDEO_SIZES } from "~/src/data/landing-videos"

import { cn } from "~/src/lib/cn"
import { MILLISECONDS_PER_MINUTE } from "~/src/lib/duration"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import courseTourPosterAvif800 from "~/src/presentation/assets/motion/course-tour-800.avif?url"
import courseTourPosterWebp800 from "~/src/presentation/assets/motion/course-tour-800.webp?url"
import courseTourPosterAvif from "~/src/presentation/assets/motion/course-tour.avif?url"
import courseTourVideoMp4 from "~/src/presentation/assets/motion/course-tour.mp4?url"
import courseTourVideoWebm from "~/src/presentation/assets/motion/course-tour.webm?url"
import courseTourPosterWebp from "~/src/presentation/assets/motion/course-tour.webp?url"
import { ROUTES } from "~/src/routes"

const TOUR = LANDING_VIDEO_SIZES["course-tour"]
const TOUR_POSTER_SMALL_WIDTH = 800

const TOUR_SIZES =
  "(min-width: 80rem) calc((80rem - 12.5rem - 2px) * 1.35 / 2.35), (min-width: 64rem) calc((100vw - 12.5rem - 2px) * 1.35 / 2.35), (min-width: 48rem) calc(100vw - 9.5rem - 2px), calc(100vw - 6.5rem - 2px)"

const NEAR_VIEWPORT = "100% 0px 100% 0px"

const LINK_CLASSNAME =
  "rounded-sm transition-colors duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

const COURSE_COLUMNS =
  "grid snap-x snap-mandatory auto-cols-[minmax(85%,1fr)] grid-flow-col divide-x divide-border overflow-x-auto overflow-y-hidden [scrollbar-width:none] md:auto-cols-[minmax(0,1fr)]"

const COURSE_COLUMN = "flex min-w-0 snap-start flex-col p-7 md:p-9"

const COURSE_DETAIL = "mt-5 border-t border-border pt-5"

const posterSet = (small: string, large: string): string => `${small} ${String(TOUR_POSTER_SMALL_WIDTH)}w, ${large} ${String(TOUR.width)}w`

const takeOver = (video: HTMLVideoElement): (() => void) => {
  video.focus({ preventScroll: true })

  return () => {
    video.pause()
  }
}

const CourseTour = (): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass.tour")
  const [isStarted, setIsStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-card">
      {isStarted && (
        <video
          ref={takeOver}
          aria-describedby="course-tour-body"
          aria-label={t("label")}
          autoPlay
          className="absolute inset-0 size-full"
          controls
          height={TOUR.height}
          muted
          onPlaying={() => {
            setIsPlaying(true)
          }}
          playsInline
          width={TOUR.width}
        >
          <source src={courseTourVideoWebm} type="video/webm" />
          <source src={courseTourVideoMp4} type="video/mp4" />
        </video>
      )}
      <picture className={cn("pointer-events-none absolute inset-0", { invisible: isPlaying })}>
        <source sizes={TOUR_SIZES} srcSet={posterSet(courseTourPosterAvif800, courseTourPosterAvif)} type="image/avif" />
        <img
          alt=""
          className="size-full"
          decoding="async"
          height={TOUR.height}
          loading="lazy"
          sizes={TOUR_SIZES}
          src={courseTourPosterWebp}
          srcSet={posterSet(courseTourPosterWebp800, courseTourPosterWebp)}
          width={TOUR.width}
        />
      </picture>
      {!isStarted && (
        <Button
          className="group absolute inset-0 flex cursor-pointer items-center justify-center data-focus-visible:outline-2 data-focus-visible:-outline-offset-2 data-focus-visible:outline-ring"
          onPress={() => {
            setIsStarted(true)
          }}
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-ring/50 bg-background/72 shadow-[0_8px_24px_-8px_oklch(0_0_0/0.6)] backdrop-blur-sm transition-[scale,background-color] duration-300 ease-exp group-hover:scale-106 group-hover:bg-background/86 motion-reduce:transition-none md:size-16">
            <Play aria-hidden className="size-4 translate-x-0.5 fill-current text-ring md:size-5" strokeWidth={0} />
          </span>
          <span className="sr-only">{t("play")}</span>
        </Button>
      )}
    </div>
  )
}

const FreeLesson = ({ course }: { readonly course: Course["showcase"][number] }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")

  if (course.freeLesson === undefined) {
    return <p className="truncate text-body-sm text-muted-foreground">{t("previews", { count: course.previewCount })}</p>
  }

  return (
    <Link
      className={cn(LINK_CLASSNAME, "group flex items-center gap-2.5 text-body-sm text-muted-foreground hover:text-foreground")}
      params={{ course: course.slug, lesson: course.freeLesson.slug }}
      to="/courses/$course/$lesson"
    >
      <Play aria-hidden className="size-3 shrink-0 fill-current text-ring" strokeWidth={0} />
      <span className="min-w-0 truncate">{course.freeLesson.title}</span>{" "}
      <span className="ml-auto shrink-0 font-mono text-spec text-ring">{t("preview")}</span>
    </Link>
  )
}

const ShowcaseCourse = ({ course }: { readonly course: Course["showcase"][number] }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")

  return (
    <li className={COURSE_COLUMN}>
      <h4 className="text-title">
        <Link
          className={cn(LINK_CLASSNAME, "block truncate text-foreground hover:text-ring")}
          params={{ course: course.slug }}
          to="/courses/$course"
        >
          {course.title}
        </Link>
      </h4>
      <p className="mt-2 flex gap-x-5 overflow-hidden font-mono text-spec whitespace-nowrap text-muted-foreground">
        <span>{t(`kinds.${course.kind}`)}</span>
        <span>{t("lessons", { count: course.lessonCount })}</span>
        <span>{t("minutes", { minutes: Math.round(course.durationMs / MILLISECONDS_PER_MINUTE) })}</span>
      </p>
      <div className={COURSE_DETAIL}>
        <FreeLesson course={course} />
      </div>
    </li>
  )
}

const ShowcaseCoursePending = (): JSX.Element => (
  <div className={COURSE_COLUMN}>
    <Skeleton className="h-lh w-2/3 scale-y-70 text-title" />
    <Skeleton className="mt-2 h-lh w-1/2 scale-y-70 text-spec" />
    <div className={COURSE_DETAIL}>
      <Skeleton className="h-lh w-4/5 scale-y-70 text-body-sm" />
    </div>
  </div>
)

const ShowcaseMessage = ({ message }: { readonly message: "empty" | "error" }): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")

  return (
    <div className="grid">
      <div aria-hidden className="invisible col-start-1 row-start-1">
        <ShowcaseCoursePending />
      </div>
      <p className="col-start-1 row-start-1 flex items-center overflow-hidden px-7 text-body text-pretty text-muted-foreground contain-size md:px-9">
        {t(message)}
      </p>
    </div>
  )
}

const ShowcaseCourses = ({ courses }: { readonly courses: Course["showcase"] | undefined }): JSX.Element => {
  if (courses === undefined) {
    return (
      <div aria-hidden className={cn(COURSE_COLUMNS, "max-md:*:not-first:hidden")}>
        {Array.from({ length: COURSE_SHOWCASE.COURSES }, (_, course) => (
          <ShowcaseCoursePending key={course} />
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return <ShowcaseMessage message="empty" />
  }

  return (
    <ul className={COURSE_COLUMNS}>
      {courses.map((course) => (
        <ShowcaseCourse course={course} key={course.id} />
      ))}
    </ul>
  )
}

export const CourseShowcase = (): JSX.Element => {
  const t = useTranslations("pages.landing.studio.masterclass")
  const locale = getCurrentLocale()
  const article = useRef<HTMLElement>(null)
  const isNear = useInView(article, { margin: NEAR_VIEWPORT, once: true })

  const { data, isError } = useQuery({ ...courseShowcaseQuery({ locale }), enabled: isNear })

  return (
    <article
      ref={article}
      aria-busy={isNear && data === undefined && !isError}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="p-7 md:p-9">
        <h3 className="text-headline-support text-balance text-foreground">{t("title")}</h3>
        <p className="mt-3 max-w-[68ch] text-body text-pretty text-muted-foreground">{t("body")}</p>
      </div>

      <div className="grid gap-7 border-y border-border bg-background px-7 py-8 md:px-9 md:py-10 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12">
        <CourseTour />
        <div className="min-w-0">
          <p className="text-title text-balance text-foreground">{t("tour.title")}</p>
          <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground" id="course-tour-body">
            {t("tour.body")}
          </p>
        </div>
      </div>

      {isError && <ShowcaseMessage message="error" />}
      {!isError && <ShowcaseCourses courses={data} />}

      <div className="border-t border-border px-7 py-5 md:px-9">
        <Link
          className={cn(
            LINK_CLASSNAME,
            "group inline-flex items-center gap-2 text-body-sm font-medium text-foreground hover:text-muted-foreground",
          )}
          to={ROUTES.COURSES}
        >
          {t("browse")}
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </article>
  )
}
