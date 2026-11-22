import { COURSE_COVER_PATH_PREFIX } from "~/src/modules/course/course.cover"
import { LESSON_ATTACHMENT_PATH_PREFIX } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { WORKER_HANDLER_KIND, type WorkerHandler } from "~/src/data/worker.constants"

const isUnder = (request: Request, prefix: string): boolean => new URL(request.url).pathname.startsWith(`${prefix}/`)

export const COURSES_WORKER_HANDLERS = [
  {
    fetch: async (request) => {
      if (isUnder(request, COURSE_COVER_PATH_PREFIX)) {
        const { serveCover } = await import("~/src/modules/course/course.delivery")
        return serveCover(request)
      }

      if (isUnder(request, LESSON_ATTACHMENT_PATH_PREFIX)) {
        const { serveAttachment } = await import("~/src/modules/lesson-attachment/lesson-attachment.delivery")
        return serveAttachment(request)
      }

      const { serveMedia } = await import("~/src/modules/video/video.delivery")
      return serveMedia(request)
    },
    kind: WORKER_HANDLER_KIND.REQUEST,
    pathPrefix: `${MEDIA_PATH_PREFIX}/`,
  },
] as const satisfies readonly WorkerHandler[]
