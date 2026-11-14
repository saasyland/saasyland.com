import { WORKER_HANDLER_KIND, type WorkerHandler } from "~/src/data/worker.constants"
import * as AREA_WORKER_HANDLERS from "~/src/data/worker.entries"

const AREAS: Readonly<Record<string, readonly WorkerHandler[]>> = AREA_WORKER_HANDLERS

const HANDLERS = Object.values(AREAS).flat()

export const DOCUMENT_HANDLERS = HANDLERS.filter((handler) => handler.kind === WORKER_HANDLER_KIND.DOCUMENT)

export const REQUEST_HANDLERS = HANDLERS.filter((handler) => handler.kind === WORKER_HANDLER_KIND.REQUEST)
