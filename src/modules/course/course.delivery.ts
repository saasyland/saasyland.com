import "@tanstack/react-start/server-only"

import { and, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { COURSE_COVER_PATH_PREFIX, coverContentType } from "~/src/modules/course/course.cover"
import { course } from "~/src/modules/course/course.schema"
import { coursePath, isOpenToVisitors } from "~/src/modules/course/course.utils"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { isBeingRecorded, playableVideo } from "~/src/modules/lesson/lesson.playable"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

import { serveStoredImage } from "~/src/lib/media-delivery"
import { emptyResponse, isReadRequest, methodNotAllowed } from "~/src/lib/media-response"
import { SITEMAP_CONTENT_TYPE, type SitemapPage, buildSitemap, localizedSitemapPages } from "~/src/lib/sitemap"

import { APP_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const EDGE_CACHE_NAME = "covers"

const COVER_PATH = new URLPattern({
  pathname: `${COURSE_COVER_PATH_PREFIX}/:courseId([0-9a-f\\-]{36})/:file([0-9a-f\\-]{36}(?:-\\d{1,4})?\\.[a-z]{3,4})`,
})

export const serveCover = (request: Request): Promise<Response> =>
  serveStoredImage(request, { cacheName: EDGE_CACHE_NAME, contentType: coverContentType, pattern: COVER_PATH })

const SITEMAP_CACHE_CONTROL = "public, max-age=3600"

const publishedCourse = eq(course.status, COURSE_STATUS.PUBLISHED)

const readPublishedCourses = () =>
  db.select({ id: course.id, slug: course.slug, updatedAt: course.updatedAt }).from(course).where(publishedCourse)

const readPublishedChapters = () =>
  db
    .select({ courseId: chapter.courseId, updatedAt: chapter.updatedAt })
    .from(chapter)
    .innerJoin(course, eq(course.id, chapter.courseId))
    .where(publishedCourse)

const readPublishedLessons = () =>
  db
    .select({
      access: lesson.access,
      courseId: lesson.courseId,
      durationMs: video.durationMs,
      format: lesson.format,
      slug: lesson.slug,
      updatedAt: lesson.updatedAt,
      videoUpdatedAt: video.updatedAt,
    })
    .from(lesson)
    .innerJoin(course, eq(course.id, lesson.courseId))
    .leftJoin(video, playableVideo)
    .where(and(publishedCourse, eq(lesson.status, LESSON_STATUS.PUBLISHED)))

type PublishedLesson = Awaited<ReturnType<typeof readPublishedLessons>>[number]

const latest = (dates: readonly Date[]): Date => new Date(Math.max(...dates.map((date) => date.getTime())))

const lessonModified = ({ updatedAt, videoUpdatedAt }: PublishedLesson): Date =>
  latest(videoUpdatedAt === null ? [updatedAt] : [updatedAt, videoUpdatedAt])

const listCoursePages = async (): Promise<SitemapPage[]> => {
  const [courses, chapters, lessons] = await Promise.all([readPublishedCourses(), readPublishedChapters(), readPublishedLessons()])
  const chaptersByCourse = Map.groupBy(chapters, (entry) => entry.courseId)
  const lessonsByCourse = Map.groupBy(lessons, (entry) => entry.courseId)

  const pages = courses.map((entry) => {
    const courseLessons = lessonsByCourse.get(entry.id) ?? []
    const pathname = coursePath(entry.slug)
    const modified = latest([
      entry.updatedAt,
      ...(chaptersByCourse.get(entry.id) ?? []).map((part) => part.updatedAt),
      ...courseLessons.map((part) => lessonModified(part)),
    ])

    return {
      lessons: courseLessons
        .filter((part) => isOpenToVisitors({ access: part.access, recording: isBeingRecorded(part) }))
        .flatMap((part) =>
          localizedSitemapPages({ baseUrl: APP_URL, modified: lessonModified(part), pathname: `${pathname}/${part.slug}` }),
        ),
      modified,
      pages: localizedSitemapPages({ baseUrl: APP_URL, modified, pathname }),
    }
  })

  if (pages.length === 0) {
    return []
  }

  return [
    ...localizedSitemapPages({ baseUrl: APP_URL, modified: latest(pages.map(({ modified }) => modified)), pathname: ROUTES.COURSES }),
    ...pages.flatMap((page) => page.pages),
    ...pages.flatMap((page) => page.lessons),
  ]
}

export const serveCourseSitemap = async (request: Request): Promise<Response> => {
  if (!isReadRequest(request)) {
    return methodNotAllowed()
  }

  if (new URL(request.url).pathname !== ROUTES.SITEMAPS.COURSES) {
    return emptyResponse(HTTP_STATUS.NOT_FOUND)
  }

  const headers = { "Cache-Control": SITEMAP_CACHE_CONTROL, "Content-Type": SITEMAP_CONTENT_TYPE }
  if (request.method === "HEAD") {
    return emptyResponse(HTTP_STATUS.OK, headers)
  }

  return new Response(buildSitemap(await listCoursePages()), { headers })
}
