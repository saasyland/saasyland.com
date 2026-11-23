import type { ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { cancelVideoUploadMutation } from "~/src/modules/video-upload/use-cases/cancel-video-upload"
import type { completeVideoUploadMutation } from "~/src/modules/video-upload/use-cases/complete-video-upload"
import type { startVideoUploadMutation } from "~/src/modules/video-upload/use-cases/start-video-upload"
import type { uploadVideoPartMutation } from "~/src/modules/video-upload/use-cases/upload-video-part"
import { VIDEO_UPLOAD_MUTATION_KEYS, VIDEO_UPLOAD_RETRY_DELAY_MS } from "~/src/modules/video-upload/video-upload.constants"
import { PART_FIELDS } from "~/src/modules/video-upload/video-upload.files"

import { LOCAL_UPLOAD_PHASE, uploadLessonVideo, useVideoUpload } from "~/src/hooks/use-video-upload"

const server = vi.hoisted(() => ({
  cancel: vi.fn<NonNullable<typeof cancelVideoUploadMutation.mutationFn>>(),
  complete: vi.fn<NonNullable<typeof completeVideoUploadMutation.mutationFn>>(),
  part: vi.fn<NonNullable<typeof uploadVideoPartMutation.mutationFn>>(),
  start: vi.fn<NonNullable<typeof startVideoUploadMutation.mutationFn>>(),
}))

vi.mock(import("~/src/modules/video-upload/use-cases/start-video-upload"), () => ({
  startVideoUploadMutation: { mutationFn: server.start, mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.START },
}))
vi.mock(import("~/src/modules/video-upload/use-cases/upload-video-part"), () => ({
  uploadVideoPartMutation: { mutationFn: server.part, mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.UPLOAD_PART },
}))
vi.mock(import("~/src/modules/video-upload/use-cases/complete-video-upload"), () => ({
  completeVideoUploadMutation: { mutationFn: server.complete, mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.COMPLETE },
}))
vi.mock(import("~/src/modules/video-upload/use-cases/cancel-video-upload"), () => ({
  cancelVideoUploadMutation: { mutationFn: server.cancel, mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.CANCEL },
}))

const PART_BYTES = 4
const UPLOAD_ID = "upload"
const LESSON_ID = "lesson"

const recording = (): File => new File(["0123456789"], "take.mp4", { type: "video/mp4" })

const partNumbers = (): string[] =>
  server.part.mock.calls.map(([form]) => {
    const partNumber = form.get(PART_FIELDS.PART_NUMBER)
    return typeof partNumber === "string" ? partNumber : ""
  })

const partSizes = (): number[] =>
  server.part.mock.calls.map(([form]) => {
    const part = form.get(PART_FIELDS.PART)
    return part instanceof File ? part.size : 0
  })

const renderUpload = (lessonId = LESSON_ID) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useVideoUpload(lessonId), { wrapper })

  return { ...hook, invalidateQueries, queryClient }
}

const leaveEvent = (): Event => {
  const event = new Event("beforeunload", { cancelable: true })
  globalThis.dispatchEvent(event)
  return event
}

beforeEach(() => {
  server.start.mockResolvedValue({ partBytes: PART_BYTES, parts: [], uploadId: UPLOAD_ID })
  server.part.mockImplementation((form) => Promise.resolve({ partNumber: Number(form.get(PART_FIELDS.PART_NUMBER)) }))
  server.complete.mockResolvedValue({ uploadId: UPLOAD_ID })
  server.cancel.mockResolvedValue({ uploadId: UPLOAD_ID })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe("useVideoUpload", () => {
  it("sends the file in parts, completes it and refreshes the course", async () => {
    const { invalidateQueries, result } = renderUpload()
    const file = recording()

    await act(() => result.current.start(file))

    expect(server.start).toHaveBeenCalledWith(
      { fileName: "take.mp4", lastModified: file.lastModified, lessonId: LESSON_ID, sizeBytes: 10 },
      expect.anything(),
    )
    expect(partNumbers().toSorted()).toStrictEqual(["1", "2", "3"])
    expect(partSizes().toSorted((first, second) => first - second)).toStrictEqual([2, 4, 4])
    expect(server.complete).toHaveBeenCalledWith({ uploadId: UPLOAD_ID }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
    expect(result.current.upload).toBeUndefined()
  })

  it("shows the bytes sent, warns before leaving the page and resumes from the parts the server has", async () => {
    server.start.mockResolvedValue({ partBytes: PART_BYTES, parts: [1], uploadId: UPLOAD_ID })
    const pending = Promise.withResolvers<{ partNumber: number }>()
    server.part.mockReturnValueOnce(pending.promise)
    const { result } = renderUpload()

    let upload = Promise.resolve()
    act(() => {
      upload = result.current.start(recording())
    })

    await waitFor(() => {
      expect(result.current.upload).toMatchObject({ phase: LOCAL_UPLOAD_PHASE.UPLOADING, uploadId: UPLOAD_ID, uploadedBytes: 6 })
    })
    expect(leaveEvent().defaultPrevented).toBe(true)
    expect(partNumbers().toSorted()).toStrictEqual(["2", "3"])

    await act(async () => {
      pending.resolve({ partNumber: 2 })
      await upload
    })
    expect(result.current.upload).toBeUndefined()
    expect(leaveEvent().defaultPrevented).toBe(false)
  })

  it("tries a failed part again after a pause", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.part.mockRejectedValueOnce(new Error(ERROR_CODES.INTERNAL_ERROR))
    const { result } = renderUpload()

    let upload = Promise.resolve()
    act(() => {
      upload = result.current.start(recording())
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(VIDEO_UPLOAD_RETRY_DELAY_MS)
      await upload
    })

    expect(server.part).toHaveBeenCalledTimes(4)
    expect(server.complete).toHaveBeenCalledOnce()
  })

  it("stops after the last attempt and keeps the file so the upload can continue", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.part.mockRejectedValue(new Error(ERROR_CODES.INTERNAL_ERROR))
    const { result } = renderUpload()
    const file = recording()

    let upload = Promise.resolve()
    act(() => {
      upload = result.current.start(file)
    })
    await act(async () => {
      await vi.runAllTimersAsync()
      await upload
    })

    expect(result.current.upload).toMatchObject({ error: new Error(ERROR_CODES.INTERNAL_ERROR), file, phase: LOCAL_UPLOAD_PHASE.FAILED })
    expect(server.complete).not.toHaveBeenCalled()
    expect(leaveEvent().defaultPrevented).toBe(false)

    await act(() => result.current.cancel(undefined))
  })

  it("keeps a failure that is not an error readable", async () => {
    server.start.mockRejectedValueOnce("offline")
    const { result } = renderUpload()

    await act(() => result.current.start(recording()))

    expect(result.current.upload).toMatchObject({ error: new Error("offline"), phase: LOCAL_UPLOAD_PHASE.FAILED, uploadedBytes: 0 })
    await act(() => result.current.cancel(undefined))
  })

  it("cancels an upload under way on the server and forgets it", async () => {
    const pending = Promise.withResolvers<{ partNumber: number }>()
    server.part.mockReturnValue(pending.promise)
    const { invalidateQueries, result } = renderUpload()

    let upload = Promise.resolve()
    act(() => {
      upload = result.current.start(recording())
    })
    await waitFor(() => {
      expect(result.current.upload?.uploadId).toBe(UPLOAD_ID)
    })

    await act(() => result.current.cancel(undefined))
    await act(async () => {
      pending.resolve({ partNumber: 1 })
      await upload
    })

    expect(server.cancel).toHaveBeenCalledWith({ uploadId: UPLOAD_ID }, expect.anything())
    expect(server.complete).not.toHaveBeenCalled()
    expect(result.current.upload).toBeUndefined()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
  })

  it("cancels an upload this page did not start", async () => {
    const { result } = renderUpload("other-lesson")

    await act(() => result.current.cancel("stored-upload"))

    expect(server.cancel).toHaveBeenCalledWith({ uploadId: "stored-upload" }, expect.anything())
  })

  it("starts over when another file replaces an upload under way", async () => {
    const pending = Promise.withResolvers<{ partNumber: number }>()
    server.part.mockReturnValueOnce(pending.promise)
    const { queryClient, result } = renderUpload()

    let first = Promise.resolve()
    act(() => {
      first = result.current.start(recording())
    })
    await waitFor(() => {
      expect(server.part).toHaveBeenCalled()
    })
    await act(() => uploadLessonVideo({ file: recording(), lessonId: LESSON_ID, queryClient }))
    await act(async () => {
      pending.resolve({ partNumber: 1 })
      await first
    })

    expect(server.start).toHaveBeenCalledTimes(2)
    expect(result.current.upload).toBeUndefined()
  })
})
