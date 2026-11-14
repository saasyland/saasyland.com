import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { WORKER_HANDLER_KIND, type WorkerHandler } from "~/src/data/worker.constants"

export const COURSES_WORKER_HANDLERS = [
  {
    fetch: async (request) => {
      const { serveMedia } = await import("~/src/modules/video/video.delivery")
      return serveMedia(request)
    },
    kind: WORKER_HANDLER_KIND.REQUEST,
    pathPrefix: `${MEDIA_PATH_PREFIX}/`,
  },
] as const satisfies readonly WorkerHandler[]
