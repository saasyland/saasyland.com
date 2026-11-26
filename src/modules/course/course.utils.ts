import * as zod from "zod"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { COURSE_MODE, COURSE_OFFER_CATEGORY } from "~/src/modules/course/course.constants"
import { COURSE_COVER_SIZE, courseCoverImage, coverContentType } from "~/src/modules/course/course.cover"
import type { Course } from "~/src/modules/course/course.types"
import { COURSE_ACCESS_GRANTS, GUEST, hasLessonAccess } from "~/src/modules/lesson/lesson.access"
import { LESSON_ACCESS, LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"

import { MILLISECONDS_PER_MINUTE } from "~/src/lib/duration"
import { SCHEMA_CONTEXT, type ShareImage, type StructuredDataNode, absoluteUrl, localizedUrl, toStructuredDataHtml } from "~/src/lib/seo"

import { APP_NAME, APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

type Lesson = Course["pageLesson"]

export const courseLessons = (page: Course["page"]): Lesson[] => page.chapters.flatMap(({ lessons }) => lessons)

export const isAvailable = (lesson: Pick<Lesson, "locked" | "recording">): boolean => !lesson.locked && !lesson.recording

export const isPlayable = (lesson: Pick<Lesson, "format" | "locked" | "recording">): boolean =>
  lesson.format === LESSON_FORMAT.VIDEO && isAvailable(lesson)

export const isOpenToVisitors = (lesson: Pick<Lesson, "access" | "recording">): boolean =>
  hasLessonAccess(lesson.access, GUEST) && !lesson.recording

export const nextLessonToWatch = (lessons: readonly Lesson[]): Lesson | undefined => {
  const available = lessons.filter((lesson) => isAvailable(lesson))

  return available.find((lesson) => !lesson.completed) ?? available[0]
}

export const locateLesson = (lessons: readonly Lesson[], slug: string) => {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)

  return { lesson: lessons[index], next: lessons[index + 1], previous: lessons[index - 1] }
}

export const findEditorLesson = (editor: Course["editor"], lessonId: string): Course["editorLesson"] | undefined =>
  editor.chapters.flatMap(({ lessons }) => lessons).find((lesson) => lesson.id === lessonId)

const shareImageSchema = zod.object({ cover: zod.string(), title: zod.string() }).transform(({ cover, title }, context): ShareImage => {
  const type = coverContentType(cover)
  if (type === undefined) {
    context.addIssue({ code: "custom", input: cover, message: "coverTypeUnknown" })
    return zod.NEVER
  }

  return { alt: title, height: COURSE_COVER_SIZE.height, path: courseCoverImage(cover).src, type, width: COURSE_COVER_SIZE.width }
})

export const courseShareImage = (course: { readonly cover: string | null; readonly title: string }): ShareImage | undefined =>
  shareImageSchema.safeParse(course).data

export const coursePath = (slug: string): string => `${ROUTES.COURSES}/${slug}`

const PROVIDER: StructuredDataNode = { "@type": "Organization", name: APP_NAME, sameAs: APP_URL }

const offerCategory = (lessons: readonly Lesson[]): string => {
  const paid = lessons.filter((lesson) => lesson.access === LESSON_ACCESS.PAID).length
  if (paid === 0) {
    return COURSE_OFFER_CATEGORY.FREE
  }

  return paid === lessons.length ? COURSE_OFFER_CATEGORY.PAID : COURSE_OFFER_CATEGORY.PARTIALLY_FREE
}

const courseOffers = ({ category, url }: { readonly category: string; readonly url: string }): StructuredDataNode[] => {
  const prices = category === COURSE_OFFER_CATEGORY.FREE ? [0] : COURSE_ACCESS_GRANTS.map((grant) => grant.price)

  return prices.map((price) => ({ "@type": "Offer", category, price, priceCurrency: CURRENCY_FORMAT.currency, url }))
}

const courseInstance = (lessons: readonly Lesson[]): StructuredDataNode => {
  const minutes = Math.ceil(lessons.reduce((total, lesson) => total + (lesson.durationMs ?? 0), 0) / MILLISECONDS_PER_MINUTE)
  const instance = { "@type": "CourseInstance", courseMode: COURSE_MODE.ONLINE }

  return minutes > 0 ? { ...instance, courseWorkload: `PT${String(minutes)}M` } : instance
}

const optionalList = (key: string, items: readonly string[]): StructuredDataNode => (items.length > 0 ? { [key]: items } : {})

export const courseStructuredDataHtml = ({
  level,
  locale,
  page,
}: {
  readonly level: string
  readonly locale: SupportedLocale
  readonly page: Course["page"]
}): { __html: string } => {
  const lessons = courseLessons(page)
  const url = localizedUrl({ baseUrl: APP_URL, locale, pathname: coursePath(page.course.slug) })
  const category = offerCategory(lessons)
  const image = courseShareImage(page.course)

  return toStructuredDataHtml({
    "@context": SCHEMA_CONTEXT,
    "@id": `${url}#course`,
    "@type": "Course",
    description: page.course.summary,
    educationalLevel: level,
    hasCourseInstance: [courseInstance(lessons)],
    inLanguage: locale,
    isAccessibleForFree: category === COURSE_OFFER_CATEGORY.FREE,
    name: page.course.title,
    offers: courseOffers({ category, url }),
    provider: PROVIDER,
    url,
    ...(image === undefined ? {} : { image: absoluteUrl(APP_URL, image.path) }),
    ...optionalList("teaches", page.course.outcomes),
    ...optionalList("coursePrerequisites", page.course.prerequisites),
  })
}

export const catalogueStructuredDataHtml = ({
  courses,
  locale,
}: {
  readonly courses: readonly Pick<Course["catalogueCourse"], "slug">[]
  readonly locale: SupportedLocale
}): { __html: string } =>
  toStructuredDataHtml({
    "@context": SCHEMA_CONTEXT,
    "@type": "ItemList",
    itemListElement: courses.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: localizedUrl({ baseUrl: APP_URL, locale, pathname: coursePath(entry.slug) }),
    })),
  })
