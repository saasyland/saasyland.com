import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ListOrdered } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { Course } from "~/src/modules/course/course.types"
import { courseLessons } from "~/src/modules/course/course.utils"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Sheet, SheetTitle, SheetTrigger } from "~/src/presentation/components/shadcn/sheet"

import { Curriculum } from "~/src/presentation/components/custom/courses/curriculum"

import { ROUTES } from "~/src/routes"

const CRUMB_CLASSNAME =
  "rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

interface CourseContentsProps {
  readonly currentSlug: string
  readonly data: Course["page"]
}

const ContentsHeader = ({ data }: { readonly data: Course["page"] }): JSX.Element => {
  const t = useTranslations("pages.courses")
  const lessons = courseLessons(data)

  return (
    <div className="px-3">
      <p className="flex flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground">
        <Link className={CRUMB_CLASSNAME} to={ROUTES.COURSES}>
          {t("course.breadcrumb")}
        </Link>
        <span aria-hidden>/</span>
      </p>
      <Link
        className={cn(CRUMB_CLASSNAME, "mt-1 block text-title text-balance text-foreground")}
        params={{ course: data.course.slug }}
        to="/courses/$course"
      >
        {data.course.title}
      </Link>
      {data.viewer.signedIn && (
        <p className="mt-2 font-mono text-spec text-muted-foreground">
          {t("course.progress", { completed: lessons.filter((lesson) => lesson.completed).length, total: lessons.length })}
        </p>
      )}
    </div>
  )
}

export const CourseContents = ({ currentSlug, data }: CourseContentsProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson")

  return (
    <nav aria-label={t("contents")}>
      <ContentsHeader data={data} />
      <div className="mt-6">
        <Curriculum
          chapters={data.chapters}
          compact
          courseSlug={data.course.slug}
          currentSlug={currentSlug}
          signedIn={data.viewer.signedIn}
        />
      </div>
    </nav>
  )
}

export const CourseContentsSheet = ({ currentSlug, data }: CourseContentsProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson")

  return (
    <SheetTrigger>
      <Button size="sm" variant="outline">
        <ListOrdered aria-hidden className="size-3.5" />
        {t("contents")}
      </Button>
      <Sheet className="dark w-[min(24rem,90vw)] text-foreground" side="left">
        <SheetTitle className="sr-only">{t("contents")}</SheetTitle>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-14 pb-8">
          <CourseContents currentSlug={currentSlug} data={data} />
        </div>
      </Sheet>
    </SheetTrigger>
  )
}
