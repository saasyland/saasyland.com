import { LESSON_ATTACHMENT_PATH_PREFIX } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { WORKER_HANDLER_KIND, type WorkerHandler } from "~/src/data/worker.constants"

const isDownload = (request: Request): boolean => new URL(request.url).pathname.startsWith(`${LESSON_ATTACHMENT_PATH_PREFIX}/`)

export const COURSES_WORKER_HANDLERS = [
  {
    fetch: async (request) => {
      if (isDownload(request)) {
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
