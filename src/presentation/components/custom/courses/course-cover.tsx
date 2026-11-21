import type { JSX } from "react"

import { type CourseIcon } from "~/src/modules/course/course.constants"
import { COURSE_COVER_SIZE, courseCoverImage } from "~/src/modules/course/course.cover"

import { COURSE_ICON_COMPONENTS } from "~/src/data/course-icons"

import { cn } from "~/src/lib/cn"

interface CourseCoverProps {
  readonly className?: string
  readonly course: { readonly cover: string | null; readonly icon: CourseIcon; readonly title: string }
  readonly isDecorative?: boolean
  readonly isPriority?: boolean
  readonly sizes: string
}

export const CourseCover = ({ className, course, isDecorative = false, isPriority = false, sizes }: CourseCoverProps): JSX.Element => {
  const cover = courseCoverImage(course.cover)

  if (cover === undefined) {
    const Icon = COURSE_ICON_COMPONENTS[course.icon]

    return (
      <div
        aria-hidden
        className={cn(
          "flex aspect-video items-center justify-center bg-radial-[at_50%_85%] from-ring/30 via-card via-55% to-background",
          className,
        )}
        data-slot="course-cover"
      >
        <Icon className="size-1/4 text-ring/80" strokeWidth={0.75} />
      </div>
    )
  }

  return (
    <img
      alt={isDecorative ? "" : course.title}
      className={cn("aspect-video object-cover", className)}
      data-slot="course-cover"
      decoding="async"
      fetchPriority={isPriority ? "high" : "auto"}
      height={COURSE_COVER_SIZE.height}
      loading={isPriority ? "eager" : "lazy"}
      sizes={sizes}
      src={cover.src}
      srcSet={cover.srcSet}
      width={COURSE_COVER_SIZE.width}
    />
  )
}
