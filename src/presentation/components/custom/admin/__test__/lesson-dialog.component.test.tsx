import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fill } from "~/src/platform/testing/lib/fill"

import { LESSON_ACCESS, LESSON_FORMAT, LESSON_MUTATION_KEYS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import type { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"

import { Button } from "~/src/presentation/components/shadcn/button"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { LessonDialog } from "~/src/presentation/components/custom/admin/courses/lesson-dialog"

import locales from "~/messages/en-US/locales.json"
import labels from "~/messages/en-US/pages.admin.courses.json"
import adminLabels from "~/messages/en-US/pages.admin.json"

const mocks = vi.hoisted(() => ({
  createLesson: vi.fn<NonNullable<typeof createLessonMutation.mutationFn>>(),
  uploadLessonVideo: vi.fn<(options: { file: File; lessonId: string }) => Promise<void>>(),
}))

vi.mock(import("~/src/modules/lesson/use-cases/create-lesson"), () => ({
  createLessonMutation: { mutationFn: mocks.createLesson, mutationKey: LESSON_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/hooks/use-video-upload"), async (importOriginal) => ({
  ...(await importOriginal()),
  uploadLessonVideo: mocks.uploadLessonVideo,
}))

const CHAPTER_ID = "chapter-two"

const renderDialog = async () => {
  const queryClient = adminQueryClient()
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  renderAdmin(<LessonDialog chapterId={CHAPTER_ID} trigger={<Button>{labels.curriculum.addLesson}</Button>} />, { queryClient })
  const user = userEvent.setup({ delay: null })
  await user.click(screen.getByRole("button", { name: labels.curriculum.addLesson }))
  const dialog = await screen.findByRole("dialog")

  return { dialog, user }
}

const chooseOption = async (user: ReturnType<typeof userEvent.setup>, label: string, option: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: new RegExp(label, "u") }))
  await user.click(await screen.findByRole("option", { name: option }))
}

const fileInput = (dialog: HTMLElement): HTMLInputElement => {
  const input = dialog.querySelector<HTMLInputElement>("input[type=file]")
  if (input === null) {
    throw new Error("Missing file input")
  }
  return input
}

const fillPolishSummary = async (user: ReturnType<typeof userEvent.setup>, text: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: adminLabels.components.formLanguages.panel.open }))
  const panel = await screen.findByRole("dialog", { name: adminLabels.components.formLanguages.panel.title })
  await user.click(within(panel).getByRole("tab", { name: new RegExp(`^${labels.lesson.summary}`, "u") }))
  await user.click(within(panel).getByLabelText(locales["pl-PL"]))
  await user.paste(text)
  await user.click(within(panel).getByRole("button", { name: adminLabels.components.formLanguages.panel.done }))
}

beforeEach(() => {
  mocks.createLesson.mockResolvedValue({ id: "lesson-new" })
  mocks.uploadLessonVideo.mockResolvedValue()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("lesson dialog", () => {
  it("adds a video lesson and starts uploading the recording dropped in the dialog", async () => {
    const { dialog, user } = await renderDialog()
    const recording = new File(["take"], "checkout.mp4", { type: "video/mp4" })

    await fill(user, within(dialog).getByLabelText(labels.lesson.title), "Checkout")
    await fill(user, within(dialog).getByLabelText(labels.lesson.summary), "Paying.")
    await fill(user, within(dialog).getByLabelText(labels.lesson.slug), "checkout")
    await chooseOption(user, labels.lesson.access, labels.lesson.accessLevels.account)
    await user.upload(fileInput(dialog), recording)
    expect(within(dialog).getByText("checkout.mp4 · 0 kB")).toBeVisible()
    await fillPolishSummary(user, "Płacenie.")
    await user.click(within(dialog).getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.lesson.savedUploading)
    })
    expect(mocks.createLesson).toHaveBeenCalledWith(
      {
        access: LESSON_ACCESS.ACCOUNT,
        chapterId: CHAPTER_ID,
        format: LESSON_FORMAT.VIDEO,
        slug: "checkout",
        status: LESSON_STATUS.DRAFT,
        summary: { "en-US": "Paying.", "pl-PL": "Płacenie." },
        title: { "en-US": "Checkout" },
      },
      expect.anything(),
    )
    expect(mocks.uploadLessonVideo).toHaveBeenCalledWith(expect.objectContaining({ file: recording, lessonId: "lesson-new" }))
  })

  it("adds a text lesson without uploading the recording it no longer needs", async () => {
    const { dialog, user } = await renderDialog()

    await fill(user, within(dialog).getByLabelText(labels.lesson.title), "Glossary")
    await fill(user, within(dialog).getByLabelText(labels.lesson.summary), "Words.")
    await fill(user, within(dialog).getByLabelText(labels.lesson.slug), "words")
    await user.upload(fileInput(dialog), new File(["take"], "words.mp4", { type: "video/mp4" }))
    await user.click(within(dialog).getByRole("button", { name: labels.lesson.removeRecording.replace("{name}", "words.mp4") }))
    expect(within(dialog).getByRole("button", { name: labels.lessonEditor.video.drop.choose })).toBeVisible()
    await user.upload(fileInput(dialog), new File(["take"], "words.mp4", { type: "video/mp4" }))
    await chooseOption(user, labels.lesson.format, labels.lesson.formats.text)
    expect(within(dialog).queryByText(labels.lesson.recording)).toBeNull()
    await user.click(within(dialog).getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.lesson.saved)
    })
    expect(mocks.createLesson).toHaveBeenCalledWith(expect.objectContaining({ format: LESSON_FORMAT.TEXT }), expect.anything())
    expect(mocks.uploadLessonVideo).not.toHaveBeenCalled()
  })
})
