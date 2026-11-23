import { useSyncExternalStore } from "react"

import { MutationObserver, type MutationOptions, type QueryClient, useQueryClient } from "@tanstack/react-query"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { cancelVideoUploadMutation } from "~/src/modules/video-upload/use-cases/cancel-video-upload"
import { completeVideoUploadMutation } from "~/src/modules/video-upload/use-cases/complete-video-upload"
import { startVideoUploadMutation } from "~/src/modules/video-upload/use-cases/start-video-upload"
import { uploadVideoPartMutation } from "~/src/modules/video-upload/use-cases/upload-video-part"
import {
  VIDEO_UPLOAD_CONCURRENCY,
  VIDEO_UPLOAD_PART_ATTEMPTS,
  VIDEO_UPLOAD_RETRY_DELAY_MS,
} from "~/src/modules/video-upload/video-upload.constants"
import { partFormData, uploadPartCount, uploadPartLength } from "~/src/modules/video-upload/video-upload.files"

const PART_NUMBER_BASE = 1

export const LOCAL_UPLOAD_PHASE = {
  FAILED: "failed",
  UPLOADING: "uploading",
} as const

export interface LocalVideoUpload {
  readonly error?: Error
  readonly file: File
  readonly phase: (typeof LOCAL_UPLOAD_PHASE)[keyof typeof LOCAL_UPLOAD_PHASE]
  readonly uploadId?: string
  readonly uploadedBytes: number
}

interface PartPlan {
  readonly file: File
  readonly partBytes: number
  readonly queryClient: QueryClient
  readonly signal: AbortSignal
  readonly uploadId: string
}

const uploads = new Map<string, LocalVideoUpload>()
const controllers = new Map<string, AbortController>()
const listeners = new Set<() => void>()

const warnBeforeLeaving = (event: BeforeUnloadEvent): void => {
  event.preventDefault()
}

const isUploading = (): boolean => [...uploads.values()].some(({ phase }) => phase === LOCAL_UPLOAD_PHASE.UPLOADING)

const publish = (lessonId: string, upload: LocalVideoUpload | undefined): void => {
  if (upload === undefined) {
    uploads.delete(lessonId)
  } else {
    uploads.set(lessonId, upload)
  }

  window.removeEventListener("beforeunload", warnBeforeLeaving)
  if (isUploading()) {
    window.addEventListener("beforeunload", warnBeforeLeaving)
  }

  for (const listener of listeners) {
    listener()
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

const run = <TData, TVariables>(queryClient: QueryClient, options: MutationOptions<TData, Error, TVariables>, variables: TVariables) =>
  new MutationObserver(queryClient, options).mutate(variables)

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const sendPart = async (plan: PartPlan, partNumber: number, attempt = PART_NUMBER_BASE): Promise<void> => {
  plan.signal.throwIfAborted()
  const start = (partNumber - PART_NUMBER_BASE) * plan.partBytes
  const part = plan.file.slice(start, start + uploadPartLength({ partBytes: plan.partBytes, partNumber, sizeBytes: plan.file.size }))

  try {
    await run(plan.queryClient, uploadVideoPartMutation, partFormData({ part, partNumber, uploadId: plan.uploadId }))
  } catch (error) {
    if (attempt >= VIDEO_UPLOAD_PART_ATTEMPTS) {
      throw error
    }

    await wait(VIDEO_UPLOAD_RETRY_DELAY_MS * attempt)
    await sendPart(plan, partNumber, attempt + 1)
  }
}

const sendParts = async (plan: PartPlan & { readonly lessonId: string; readonly queue: number[] }): Promise<void> => {
  const partNumber = plan.queue.shift()
  if (partNumber === undefined) {
    return
  }

  await sendPart(plan, partNumber)
  const current = uploads.get(plan.lessonId)
  if (current !== undefined) {
    const length = uploadPartLength({ partBytes: plan.partBytes, partNumber, sizeBytes: plan.file.size })
    publish(plan.lessonId, { ...current, uploadedBytes: current.uploadedBytes + length })
  }

  await sendParts(plan)
}

const transfer = async ({
  controller,
  file,
  lessonId,
  queryClient,
}: {
  controller: AbortController
  file: File
  lessonId: string
  queryClient: QueryClient
}) => {
  const started = await run(queryClient, startVideoUploadMutation, {
    fileName: file.name,
    lastModified: file.lastModified,
    lessonId,
    sizeBytes: file.size,
  })
  const plan = { file, partBytes: started.partBytes, queryClient, signal: controller.signal, uploadId: started.uploadId }
  const done = new Set<number>(started.parts)
  const queue = Array.from(
    { length: uploadPartCount({ partBytes: started.partBytes, sizeBytes: file.size }) },
    (_, index) => index + PART_NUMBER_BASE,
  )
  const uploadedBytes = [...done].reduce(
    (total, partNumber) => total + uploadPartLength({ partBytes: started.partBytes, partNumber, sizeBytes: file.size }),
    0,
  )

  publish(lessonId, { file, phase: LOCAL_UPLOAD_PHASE.UPLOADING, uploadId: started.uploadId, uploadedBytes })

  const pending = { ...plan, lessonId, queue: queue.filter((partNumber) => !done.has(partNumber)) }
  await Promise.all(Array.from({ length: VIDEO_UPLOAD_CONCURRENCY }, () => sendParts(pending))).catch((error: unknown) => {
    controller.abort(error)
    throw error
  })
  controller.signal.throwIfAborted()
  await run(queryClient, completeVideoUploadMutation, { uploadId: started.uploadId })
}

export const uploadLessonVideo = async ({ file, lessonId, queryClient }: { file: File; lessonId: string; queryClient: QueryClient }) => {
  controllers.get(lessonId)?.abort()
  const controller = new AbortController()
  controllers.set(lessonId, controller)
  publish(lessonId, { file, phase: LOCAL_UPLOAD_PHASE.UPLOADING, uploadedBytes: 0 })

  try {
    await transfer({ controller, file, lessonId, queryClient })
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    publish(lessonId, undefined)
  } catch (error) {
    if (controllers.get(lessonId) === controller) {
      publish(lessonId, {
        file,
        uploadedBytes: 0,
        ...uploads.get(lessonId),
        error: error instanceof Error ? error : new Error(String(error)),
        phase: LOCAL_UPLOAD_PHASE.FAILED,
      })
    }
  } finally {
    if (controllers.get(lessonId) === controller) {
      controllers.delete(lessonId)
    }
  }
}

export const cancelLessonVideoUpload = async ({
  lessonId,
  queryClient,
  uploadId,
}: {
  lessonId: string
  queryClient: QueryClient
  uploadId: string | undefined
}) => {
  controllers.get(lessonId)?.abort()
  controllers.delete(lessonId)
  publish(lessonId, undefined)

  if (uploadId !== undefined) {
    await run(queryClient, cancelVideoUploadMutation, { uploadId })
  }

  await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
}

export const useVideoUpload = (lessonId: string) => {
  const queryClient = useQueryClient()

  const read = (): LocalVideoUpload | undefined => uploads.get(lessonId)
  const upload = useSyncExternalStore(subscribe, read, read)

  return {
    cancel: (uploadId: string | undefined) => cancelLessonVideoUpload({ lessonId, queryClient, uploadId: upload?.uploadId ?? uploadId }),
    start: (file: File) => uploadLessonVideo({ file, lessonId, queryClient }),
    upload,
  }
}
