import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fill } from "~/src/platform/testing/lib/fill"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_MUTATION_KEYS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import type { removeLessonVideoMutation } from "~/src/modules/lesson/use-cases/remove-lesson-video"
import type { replaceLessonVideoMutation } from "~/src/modules/lesson/use-cases/replace-lesson-video"
import type { setLessonFormatMutation } from "~/src/modules/lesson/use-cases/set-lesson-format"
import type { retryVideoUploadMutation } from "~/src/modules/video-upload/use-cases/retry-video-upload"
import {
  VIDEO_UPLOAD_FAILURE,
  VIDEO_UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_MUTATION_KEYS,
  VIDEO_UPLOAD_STATUS,
} from "~/src/modules/video-upload/video-upload.constants"
import type { deleteVideoMutation } from "~/src/modules/video/use-cases/delete-video"
import { videoPlaybackQuery } from "~/src/modules/video/use-cases/get-video-playback"
import { getVideosPageQuery } from "~/src/modules/video/use-cases/get-videos"
import { VIDEO_LIBRARY_PAGE_SIZE, VIDEO_MUTATION_KEYS } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { LOCAL_UPLOAD_PHASE, type LocalVideoUpload } from "~/src/hooks/use-video-upload"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { LessonVideo } from "~/src/presentation/components/custom/admin/courses/lesson-video"

import validations from "~/messages/en-US/course.validations.json"
import errors from "~/messages/en-US/errors.json"
import labels from "~/messages/en-US/pages.admin.courses.json"

const mocks = vi.hoisted(() => {
  const upload: { current: LocalVideoUpload | undefined } = { current: undefined }

  return {
    cancel: vi.fn<(uploadId: string | undefined) => Promise<void>>(),
    deleteVideo: vi.fn<NonNullable<typeof deleteVideoMutation.mutationFn>>(),
    removeVideo: vi.fn<NonNullable<typeof removeLessonVideoMutation.mutationFn>>(),
    replaceVideo: vi.fn<NonNullable<typeof replaceLessonVideoMutation.mutationFn>>(),
    retry: vi.fn<NonNullable<typeof retryVideoUploadMutation.mutationFn>>(),
    setFormat: vi.fn<NonNullable<typeof setLessonFormatMutation.mutationFn>>(),
    start: vi.fn<(file: File) => Promise<void>>(),
    upload,
  }
})

vi.mock(import("~/src/hooks/use-video-upload"), async (importOriginal) => ({
  ...(await importOriginal()),
  useVideoUpload: () => ({ cancel: mocks.cancel, start: mocks.start, upload: mocks.upload.current }),
}))
vi.mock(import("~/src/modules/lesson/use-cases/remove-lesson-video"), () => ({
  removeLessonVideoMutation: { mutationFn: mocks.removeVideo, mutationKey: LESSON_MUTATION_KEYS.REMOVE_VIDEO },
}))
vi.mock(import("~/src/modules/lesson/use-cases/replace-lesson-video"), () => ({
  replaceLessonVideoMutation: { mutationFn: mocks.replaceVideo, mutationKey: LESSON_MUTATION_KEYS.REPLACE_VIDEO },
}))
vi.mock(import("~/src/modules/lesson/use-cases/set-lesson-format"), () => ({
  setLessonFormatMutation: { mutationFn: mocks.setFormat, mutationKey: LESSON_MUTATION_KEYS.SET_FORMAT },
}))
vi.mock(import("~/src/modules/video-upload/use-cases/retry-video-upload"), () => ({
  retryVideoUploadMutation: { mutationFn: mocks.retry, mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.RETRY },
}))
vi.mock(import("~/src/modules/video/use-cases/delete-video"), () => ({
  deleteVideoMutation: { mutationFn: mocks.deleteVideo, mutationKey: VIDEO_MUTATION_KEYS.DELETE },
}))
vi.mock(import("~/src/presentation/components/custom/video-player"), () => ({
  VideoPlayer: ({ playback }: { readonly playback: Video["playback"] }) => <div data-src={playback.src} data-testid="video-player" />,
}))

const { video: copy } = labels.lessonEditor
const UNSUPPORTED_TYPE = "Choose a recording in one of these formats: M4V, MKV, MOV, MP4, or WebM."
const LESSON_ID = "lesson-boundaries"
const CREATED_AT = new Date("2026-11-01T12:00:00Z")

const VIDEO: NonNullable<Course["editorLesson"]["video"]> = {
  captionLocales: ["en-US", "pl-PL"],
  durationMs: 125_000,
  height: 1080,
  id: "video-boundaries",
  lessonCount: 1,
  sizeBytes: 48_000_000,
  title: "Boundaries take",
  width: 1920,
}

const PLAYBACK: Video["playback"] = {
  captions: [],
  poster: "/media/a.b/video-boundaries/poster.webp",
  posterSmall: "/media/a.b/video-boundaries/poster-960.webp",
  src: "/media/a.b/video-boundaries/master.m3u8",
  storyboard: "/media/a.b/video-boundaries/storyboard.vtt",
}

const LIBRARY: Video["libraryVideo"][] = [
  { ...VIDEO, createdAt: CREATED_AT, placeholder: false, updatedAt: CREATED_AT },
  { ...VIDEO, createdAt: CREATED_AT, id: "video-spare", lessonCount: 0, placeholder: false, title: "Spare take", updatedAt: CREATED_AT },
]

const UPLOAD: NonNullable<Course["editorLesson"]["upload"]> = {
  createdAt: CREATED_AT,
  failure: null,
  fileName: "take-2.mp4",
  id: "upload-boundaries",
  sizeBytes: 30_000_000,
  status: VIDEO_UPLOAD_STATUS.QUEUED,
  uploadedBytes: 30_000_000,
}

const lessonWith = (overrides: Partial<Course["editorLesson"]> = {}): Course["editorLesson"] => ({
  access: LESSON_ACCESS.PREVIEW,
  attachments: [],
  chapterId: "chapter-one",
  description: {},
  format: LESSON_FORMAT.VIDEO,
  id: LESSON_ID,
  keyMoments: [],
  position: 1,
  slug: "boundaries",
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": "Start here." },
  title: { "en-US": "Boundaries" },
  video: null,
  ...overrides,
})

const renderVideo = (lesson: Course["editorLesson"], library: Video["libraryVideo"][] | null = LIBRARY) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(videoPlaybackQuery({ videoId: VIDEO.id }).queryKey, PLAYBACK)
  if (library !== null) {
    queryClient.setQueryData(getVideosPageQuery({ pageSize: VIDEO_LIBRARY_PAGE_SIZE }).queryKey, { rows: library, total: library.length })
  }
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  return {
    ...renderAdmin(<LessonVideo lesson={lesson} />, { path: `/admin/courses/course/lessons/${LESSON_ID}`, queryClient }),
    invalidateQueries,
    user: userEvent.setup({ delay: null }),
  }
}

const fileInput = (): HTMLInputElement => {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")
  if (input === null) {
    throw new Error("Missing file input")
  }
  return input
}

const recording = (name = "take.mp4"): File => new File(["take"], name, { type: "video/mp4" })

beforeEach(() => {
  mocks.upload.current = undefined
  mocks.start.mockResolvedValue()
  mocks.cancel.mockResolvedValue()
  mocks.removeVideo.mockResolvedValue({ deleted: true, lessonId: LESSON_ID })
  mocks.replaceVideo.mockResolvedValue({ id: LESSON_ID })
  mocks.retry.mockResolvedValue({ uploadId: UPLOAD.id })
  mocks.setFormat.mockResolvedValue({ format: LESSON_FORMAT.TEXT, id: LESSON_ID })
  mocks.deleteVideo.mockResolvedValue({ id: "video-spare" })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("lesson video without a video", () => {
  it("uploads a recording chosen in the drop zone and refuses a file that is not one", async () => {
    renderVideo(lessonWith())
    const user = userEvent.setup({ applyAccept: false, delay: null })

    expect(screen.getByRole("button", { name: copy.drop.label })).toBeVisible()
    expect(screen.getByText(copy.drop.title)).toBeVisible()
    expect(
      screen.getByText("M4V, MKV, MOV, MP4, or WebM up to 10 GB. Large files upload in parts and pick up where they stopped."),
    ).toBeVisible()
    await user.upload(fileInput(), new File(["%PDF"], "notes.pdf"))
    expect(screen.getByText(UNSUPPORTED_TYPE)).toBeVisible()
    expect(mocks.start).not.toHaveBeenCalled()

    const file = recording()
    await user.upload(fileInput(), file)

    expect(screen.queryByText(UNSUPPORTED_TYPE)).toBeNull()
    expect(mocks.start).toHaveBeenCalledWith(file)
  })

  it("uploads a recording dropped on the zone, and refuses one over the size limit", async () => {
    const { container } = renderVideo(lessonWith())
    const zone = container.querySelector("[data-slot=video-drop-zone]") ?? container
    const drop = (file: File) => {
      const dataTransfer = {
        dropEffect: "none",
        effectAllowed: "all",
        files: [file],
        items: [{ getAsFile: () => file, kind: "file", type: file.type, webkitGetAsEntry: () => ({ isFile: true }) }],
        types: ["Files"],
      }
      fireEvent.dragEnter(zone, { dataTransfer })
      fireEvent.dragOver(zone, { dataTransfer })
      fireEvent.drop(zone, { dataTransfer })
    }

    const large = recording("large.mp4")
    Object.defineProperty(large, "size", { value: VIDEO_UPLOAD_MAX_BYTES + 1 })
    drop(large)
    expect(await screen.findByText(validations.videoTooLarge.replace("{max, number}", "10"))).toBeVisible()

    const file = recording()
    drop(file)
    await waitFor(() => {
      expect(mocks.start).toHaveBeenCalledWith(file)
    })
  })

  it("makes the lesson a text lesson, and offers a video from the library", async () => {
    const { user } = renderVideo(lessonWith())

    expect(screen.getByText(copy.noVideo.description)).toBeVisible()
    await user.click(screen.getByRole("switch", { name: copy.noVideo.label }))

    await waitFor(() => {
      expect(mocks.setFormat).toHaveBeenCalledWith({ format: LESSON_FORMAT.TEXT, lessonId: LESSON_ID }, expect.anything())
    })
    expect(screen.getByRole("button", { name: copy.picker.open })).toBeVisible()
  })

  it("explains a refused change of format", async () => {
    mocks.setFormat.mockRejectedValueOnce(new Error(ERROR_CODES.CONFLICT))
    const { user } = renderVideo(lessonWith())

    await user.click(screen.getByRole("switch", { name: copy.noVideo.label }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.CONFLICT)
    })
  })
})

describe("text lesson", () => {
  it("says the lesson has no video and turns it back into a video lesson", async () => {
    mocks.setFormat.mockResolvedValue({ format: LESSON_FORMAT.VIDEO, id: LESSON_ID })
    const { invalidateQueries, user } = renderVideo(lessonWith({ format: LESSON_FORMAT.TEXT }))

    expect(screen.getByText(copy.text)).toBeVisible()
    expect(screen.queryByRole("button", { name: copy.drop.label })).toBeNull()
    expect(screen.queryByRole("button", { name: copy.picker.open })).toBeNull()
    const toggle = screen.getByRole("switch", { name: copy.noVideo.label })
    expect(toggle).toBeChecked()

    await user.click(toggle)

    await waitFor(() => {
      expect(mocks.setFormat).toHaveBeenCalledWith({ format: LESSON_FORMAT.VIDEO, lessonId: LESSON_ID }, expect.anything())
    })
    expect(invalidateQueries).toHaveBeenCalled()
  })
})

describe("lesson with a video", () => {
  it("plays the video and describes it, and keeps the lesson a video lesson", async () => {
    renderVideo(lessonWith({ video: VIDEO }))

    expect(await screen.findByTestId("video-player")).toHaveAttribute("data-src", PLAYBACK.src)
    expect(screen.getByText(VIDEO.title, { selector: "p" })).toBeVisible()
    expect(screen.getByText("2:05 · 1920×1080 · 48 MB")).toBeVisible()
    expect(screen.getByText("Captions: en-US and pl-PL")).toBeVisible()
    expect(screen.getByText(copy.ready)).toBeVisible()
    expect(screen.getByRole("switch", { name: copy.noVideo.label })).toBeDisabled()
    expect(screen.getByText(copy.noVideo.locked)).toBeVisible()
    expect(screen.queryByRole("button", { name: copy.drop.label })).toBeNull()
  })

  it("shows a skeleton until the signed playback arrives", () => {
    renderVideo(lessonWith({ video: { ...VIDEO, captionLocales: [], id: "video-unsigned" } }))

    expect(screen.queryByTestId("video-player")).toBeNull()
    expect(screen.queryByText(/Captions/u)).toBeNull()
  })

  it("replaces the video with a new recording", async () => {
    const { user } = renderVideo(lessonWith({ video: VIDEO }))

    const file = recording()
    await user.upload(fileInput(), file)

    expect(mocks.start).toHaveBeenCalledWith(file)
  })

  it.each([
    ["the drop zone", lessonWith()],
    ["the replace button", lessonWith({ video: VIDEO })],
  ])("starts nothing when the file dialog of %s closes without a file", (_, lesson) => {
    renderVideo(lesson)

    fireEvent.change(fileInput(), { target: { files: [] } })

    expect(mocks.start).not.toHaveBeenCalled()
  })

  it("deletes a video only this lesson uses", async () => {
    const { user } = renderVideo(lessonWith({ video: VIDEO }))

    await user.click(screen.getByRole("button", { name: copy.remove }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText(copy.removeTitle)).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: copy.remove }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(copy.removed)
    })
    expect(mocks.removeVideo).toHaveBeenCalledWith({ lessonId: LESSON_ID }, expect.anything())
  })

  it("takes a shared video off the lesson only", async () => {
    mocks.removeVideo.mockResolvedValue({ deleted: false, lessonId: LESSON_ID })
    const { user } = renderVideo(lessonWith({ video: { ...VIDEO, lessonCount: 3 } }))

    await user.click(screen.getByRole("button", { name: copy.detach }))
    const dialog = await screen.findByRole("alertdialog")
    expect(within(dialog).getByText("“Boundaries take” stays on the 2 other lessons that use it.")).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: copy.detach }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(copy.detached)
    })
  })

  it("explains a failed removal", async () => {
    mocks.removeVideo.mockRejectedValueOnce(new Error(ERROR_CODES.FORBIDDEN))
    const { user } = renderVideo(lessonWith({ video: VIDEO }))

    await user.click(screen.getByRole("button", { name: copy.remove }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.remove }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.FORBIDDEN)
    })
  })

  it("keeps playing the current video while its replacement waits for the encoder", () => {
    renderVideo(lessonWith({ upload: UPLOAD, video: VIDEO }))

    expect(screen.getByText(VIDEO.title, { selector: "p" })).toBeVisible()
    expect(screen.getByText(copy.queued)).toBeVisible()
    expect(screen.queryByRole("button", { name: copy.replace })).toBeNull()
    expect(screen.queryByRole("button", { name: copy.picker.open })).toBeNull()
  })
})

describe("upload in this tab", () => {
  it("shows the progress and cancels the upload", async () => {
    mocks.upload.current = { file: recording(), phase: LOCAL_UPLOAD_PHASE.UPLOADING, uploadId: UPLOAD.id, uploadedBytes: 2 }
    const { user } = renderVideo(lessonWith())

    expect(screen.getByRole("progressbar", { name: "Uploading take.mp4" })).toHaveAttribute("aria-valuetext", "0 kB of 0 kB")
    expect(screen.getByText(copy.keepOpen)).toBeVisible()
    expect(screen.queryByRole("button", { name: copy.drop.label })).toBeNull()
    expect(screen.getByRole("switch", { name: copy.noVideo.label })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: copy.cancel }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(copy.cancelled)
    })
    expect(mocks.cancel).toHaveBeenCalledWith(UPLOAD.id)
  })

  it("explains a cancellation that failed", async () => {
    mocks.cancel.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    mocks.upload.current = { file: recording(), phase: LOCAL_UPLOAD_PHASE.UPLOADING, uploadedBytes: 0 }
    const { user } = renderVideo(lessonWith())

    await user.click(screen.getByRole("button", { name: copy.cancel }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
  })

  it("says why an upload stopped and continues it with the same file", async () => {
    const file = recording()
    mocks.upload.current = { error: new Error(ERROR_CODES.INTERNAL_ERROR), file, phase: LOCAL_UPLOAD_PHASE.FAILED, uploadedBytes: 0 }
    const { user } = renderVideo(lessonWith())

    expect(screen.getByRole("alert")).toHaveTextContent(`The upload stopped: ${errors.codes.INTERNAL_ERROR}`)
    expect(screen.queryByText(copy.keepOpen)).toBeNull()
    await user.click(screen.getByRole("button", { name: copy.resumeUpload }))

    expect(mocks.start).toHaveBeenCalledWith(file)
  })
})

describe("upload stored on the server", () => {
  it("continues an interrupted upload with the file chosen again", async () => {
    const { user } = renderVideo(lessonWith({ upload: { ...UPLOAD, status: VIDEO_UPLOAD_STATUS.UPLOADING, uploadedBytes: 10_000_000 } }))

    expect(screen.getByRole("progressbar", { name: "Uploading take-2.mp4" })).toHaveAttribute("aria-valuetext", "10 MB of 30 MB")
    expect(screen.getByText("The upload of take-2.mp4 stopped before it finished. Choose the same file to continue it.")).toBeVisible()
    const file = recording("take-2.mp4")
    await user.upload(fileInput(), file)

    expect(mocks.start).toHaveBeenCalledWith(file)
  })

  it("shows the encoder command while the upload waits for it", async () => {
    const { user } = renderVideo(lessonWith({ upload: UPLOAD }))

    expect(screen.getByText(copy.queued)).toBeVisible()
    expect(screen.getByText(`bun run video:encode:${import.meta.env.MODE}`)).toBeVisible()
    await user.click(screen.getByRole("button", { name: copy.cancel }))

    expect(mocks.cancel).toHaveBeenCalledWith(UPLOAD.id)
  })

  it("shows that the upload is being encoded", () => {
    renderVideo(lessonWith({ upload: { ...UPLOAD, status: VIDEO_UPLOAD_STATUS.ENCODING } }))

    expect(screen.getByRole("progressbar", { name: "Encoding take-2.mp4" })).toBeVisible()
    expect(screen.getByText(copy.encodingHint)).toBeVisible()
  })

  it.each([
    { failure: VIDEO_UPLOAD_FAILURE.UNREADABLE, message: "FFmpeg could not read take-2.mp4 as a video. Upload another recording." },
    { failure: null, message: "FFmpeg stopped before take-2.mp4 was encoded. Encode it again, or upload another recording." },
  ])("explains a failed encoding ($failure) and encodes it again", async ({ failure, message }) => {
    const { invalidateQueries, user } = renderVideo(lessonWith({ upload: { ...UPLOAD, failure, status: VIDEO_UPLOAD_STATUS.FAILED } }))

    expect(screen.getByText(copy.failed)).toBeVisible()
    expect(screen.getByRole("alert")).toHaveTextContent(message)
    expect(screen.getByRole("button", { name: copy.uploadAnother })).toBeVisible()
    await user.click(screen.getByRole("button", { name: copy.retry }))

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalled()
    })
    expect(mocks.retry).toHaveBeenCalledWith({ uploadId: UPLOAD.id }, expect.anything())
  })

  it("starts over with another recording after a failed encoding", async () => {
    const { user } = renderVideo(lessonWith({ upload: { ...UPLOAD, status: VIDEO_UPLOAD_STATUS.FAILED } }))
    const file = recording("take-3.mp4")

    await user.upload(fileInput(), file)

    expect(mocks.start).toHaveBeenCalledWith(file)
  })
})

describe("video picker", () => {
  it("marks only the video being put on the lesson while it saves", async () => {
    const { promise, resolve } = Promise.withResolvers<{ id: string }>()
    mocks.replaceVideo.mockReturnValueOnce(promise)
    const { user } = renderVideo(lessonWith())

    await user.click(screen.getByRole("button", { name: copy.picker.open }))
    const dialog = await screen.findByRole("dialog", { name: copy.picker.title })
    const spare = within(dialog).getByRole("button", { name: "Use Spare take" })
    await user.click(spare)

    await waitFor(() => {
      expect(spare).toHaveAttribute("data-pending", "true")
    })
    expect(within(dialog).getByRole("button", { name: "Use Boundaries take" })).not.toHaveAttribute("data-pending")
    resolve({ id: LESSON_ID })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(copy.picker.used)
    })
  })

  it("lists the encoded videos with their use and puts one on the lesson", async () => {
    const { user } = renderVideo(lessonWith())

    await user.click(screen.getByRole("button", { name: copy.picker.open }))
    const dialog = await screen.findByRole("dialog", { name: copy.picker.title })
    expect(within(dialog).getByText("Used in 1 lesson")).toBeVisible()
    expect(within(dialog).getByText("Not used by any lesson")).toBeVisible()
    await user.click(within(dialog).getByRole("button", { name: "Use Spare take" }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(copy.picker.used)
    })
    expect(mocks.replaceVideo).toHaveBeenCalledWith({ lessonId: LESSON_ID, videoId: "video-spare" }, expect.anything())
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: copy.picker.title })).toBeNull()
    })
  })

  it("marks the lesson's own video and finds videos by title", async () => {
    const { user } = renderVideo(lessonWith({ video: VIDEO }))

    await user.click(screen.getByRole("button", { name: copy.picker.open }))
    const dialog = await screen.findByRole("dialog", { name: copy.picker.title })
    expect(within(dialog).getByRole("button", { name: "Use Boundaries take" })).toBeDisabled()
    expect(within(dialog).getByText(copy.picker.current)).toBeVisible()

    await fill(user, within(dialog).getByRole("searchbox", { name: copy.picker.search }), "spare")
    expect(within(dialog).queryByText(VIDEO.title)).toBeNull()
    await user.clear(within(dialog).getByRole("searchbox", { name: copy.picker.search }))
    await fill(user, within(dialog).getByRole("searchbox", { name: copy.picker.search }), "nothing")
    expect(within(dialog).getByText("No video matches “nothing”.")).toBeVisible()
  })

  it("deletes a video no lesson uses", async () => {
    const { user } = renderVideo(lessonWith())

    await user.click(screen.getByRole("button", { name: copy.picker.open }))
    const dialog = await screen.findByRole("dialog", { name: copy.picker.title })
    expect(within(dialog).queryByRole("button", { name: "Delete Boundaries take" })).toBeNull()
    await user.click(within(dialog).getByRole("button", { name: "Delete Spare take" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.picker.confirmDelete }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("“Spare take” was deleted")
    })
    expect(mocks.deleteVideo).toHaveBeenCalledWith({ videoId: "video-spare" }, expect.anything())
  })

  it("explains failures to use or delete a video", async () => {
    mocks.replaceVideo.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    mocks.deleteVideo.mockRejectedValueOnce(new Error(ERROR_CODES.FORBIDDEN))
    const { user } = renderVideo(lessonWith())

    await user.click(screen.getByRole("button", { name: copy.picker.open }))
    const dialog = await screen.findByRole("dialog", { name: copy.picker.title })
    await user.click(within(dialog).getByRole("button", { name: "Use Spare take" }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
    await user.click(within(dialog).getByRole("button", { name: "Delete Spare take" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: copy.picker.confirmDelete }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.FORBIDDEN)
    })
  })

  it("says when there is no video yet, and waits for the list", async () => {
    const { user } = renderVideo(lessonWith(), [])

    await user.click(screen.getByRole("button", { name: copy.picker.open }))
    expect(within(await screen.findByRole("dialog", { name: copy.picker.title })).getByText(copy.picker.empty)).toBeVisible()
  })

  it("shows placeholders while the list loads", async () => {
    const { user } = renderVideo(lessonWith(), null)

    await user.click(screen.getByRole("button", { name: copy.picker.open }))
    const dialog = await screen.findByRole("dialog", { name: copy.picker.title })
    expect(dialog.querySelector("[aria-busy=true]")).not.toBeNull()
    expect(within(dialog).queryByRole("searchbox")).toBeNull()
  })
})
