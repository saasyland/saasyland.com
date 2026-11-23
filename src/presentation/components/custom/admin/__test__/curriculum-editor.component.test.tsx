import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_MUTATION_KEYS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import type { reorderCurriculumMutation } from "~/src/modules/course/use-cases/reorder-curriculum"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

import { LOCAL_UPLOAD_PHASE, type LocalVideoUpload } from "~/src/hooks/use-video-upload"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { CurriculumEditor } from "~/src/presentation/components/custom/admin/courses/curriculum-editor"

import errors from "~/messages/en-US/errors.json"
import labels from "~/messages/en-US/pages.admin.courses.json"

const reorder = vi.hoisted(() => vi.fn<NonNullable<typeof reorderCurriculumMutation.mutationFn>>())
const localUpload = vi.hoisted(() => vi.fn<(lessonId: string) => LocalVideoUpload | undefined>())

vi.mock(import("~/src/modules/course/use-cases/reorder-curriculum"), () => ({
  reorderCurriculumMutation: { mutationFn: reorder, mutationKey: COURSE_MUTATION_KEYS.REORDER_CURRICULUM },
}))
vi.mock(import("~/src/hooks/use-video-upload"), async (importOriginal) => ({
  ...(await importOriginal()),
  useVideoUpload: (lessonId: string) => ({ cancel: vi.fn(), start: vi.fn(), upload: localUpload(lessonId) }),
}))

const COURSE_ID = "course"
const UPDATED_AT = new Date("2026-11-01T12:00:00Z")
const RECORDING = new File(["take"], "take.mp4", { type: "video/mp4" })

const lesson = (id: string, chapterId: string, position: number): Course["editorLesson"] => ({
  access: LESSON_ACCESS.PAID,
  attachments: [],
  chapterId,
  description: {},
  format: LESSON_FORMAT.VIDEO,
  id,
  keyMoments: [],
  position,
  slug: id,
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": id },
  title: { "en-US": id[0]?.toUpperCase() + id.slice(1) },
  upload: undefined,
  video: null,
})

const EDITOR: Course["editor"] = {
  chapters: [
    {
      id: "foundations",
      lessons: [lesson("boundaries", "foundations", 1), lesson("sessions", "foundations", 2)],
      position: 1,
      summary: {},
      title: { "en-US": "Foundations" },
    },
    { id: "product", lessons: [lesson("billing", "product", 1)], position: 2, summary: {}, title: { "en-US": "Product" } },
  ],
  course: {
    cover: null,
    createdAt: UPDATED_AT,
    icon: COURSE_ICON.ROCKET,
    id: COURSE_ID,
    kind: COURSE_KIND.COURSE,
    level: COURSE_LEVEL.BEGINNER,
    outcomes: {},
    position: 1,
    prerequisites: {},
    slug: "the-walkthrough",
    status: COURSE_STATUS.PUBLISHED,
    summary: { "en-US": "How it works." },
    title: { "en-US": "The walkthrough" },
    updatedAt: UPDATED_AT,
  },
}

const Harness = (): JSX.Element => {
  const { data } = useSuspenseQuery(courseEditorQuery({ courseId: COURSE_ID }))

  return <CurriculumEditor editor={data} />
}

const renderCurriculum = () => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(courseEditorQuery({ courseId: COURSE_ID }).queryKey, EDITOR)
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  renderAdmin(<Harness />, { path: `/admin/courses/${COURSE_ID}`, queryClient })

  return { queryClient, user: userEvent.setup({ delay: null }) }
}

const rowTitles = (): string[] =>
  within(screen.getByRole("grid", { name: labels.curriculum.title }))
    .getAllByRole("row")
    .map((row) => row.querySelector("h3, p")?.textContent ?? "")
    .filter((title) => title.length > 0)

const dragWithKeyboard = async (
  user: ReturnType<typeof userEvent.setup>,
  { name, start, steps }: { readonly name: string; readonly start: string; readonly steps: readonly (readonly [string, string])[] },
): Promise<void> => {
  const row = screen.getByRole("row", { name })
  act(() => {
    row.focus()
  })
  await user.keyboard("{ArrowRight}")
  await user.keyboard("{Enter}")
  await waitFor(() => {
    expect(document.activeElement).toHaveAttribute("aria-label", start)
  })
  for (const [key, target] of steps) {
    await user.keyboard(key)
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("aria-label", target)
    })
  }
  await user.keyboard("{Enter}")
}

beforeEach(() => {
  reorder.mockResolvedValue({ courseId: COURSE_ID, moved: 2 })
  localUpload.mockReset()
  vi.spyOn(toast, "error").mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("curriculum order", () => {
  it("lists every chapter with its lessons below it and explains how to move them", () => {
    renderCurriculum()

    expect(rowTitles()).toStrictEqual(["Foundations", "Boundaries", "Sessions", "Product", "Billing"])
    expect(screen.getByText(labels.curriculum.reorderHint)).toBeVisible()
  })

  it("moves a lesson into another chapter with the keyboard and saves the whole order", async () => {
    const { user } = renderCurriculum()

    await dragWithKeyboard(user, {
      name: "Sessions",
      start: "Insert between Sessions and Product",
      steps: [["{ArrowDown}", "Insert between Product and Billing"]],
    })

    await waitFor(() => {
      expect(reorder).toHaveBeenCalledWith(
        {
          chapters: [
            { chapterId: "foundations", lessonIds: ["boundaries"] },
            { chapterId: "product", lessonIds: ["sessions", "billing"] },
          ],
          courseId: COURSE_ID,
        },
        expect.anything(),
      )
    })
    expect(rowTitles()).toStrictEqual(["Foundations", "Boundaries", "Product", "Sessions", "Billing"])
  })

  it("moves a chapter with its lessons and puts the order back when the server refuses it", async () => {
    reorder.mockRejectedValueOnce(new Error(ERROR_CODES.CONFLICT))
    const { user } = renderCurriculum()

    await dragWithKeyboard(user, {
      name: "Product",
      start: "Insert after Billing",
      steps: [
        ["{ArrowUp}", "Insert between Sessions and Product"],
        ["{ArrowUp}", "Insert before Foundations"],
      ],
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.CONFLICT)
    })
    expect(reorder).toHaveBeenCalledWith(
      {
        chapters: [
          { chapterId: "product", lessonIds: ["billing"] },
          { chapterId: "foundations", lessonIds: ["boundaries", "sessions"] },
        ],
        courseId: COURSE_ID,
      },
      expect.anything(),
    )
    await waitFor(() => {
      expect(rowTitles()).toStrictEqual(["Foundations", "Boundaries", "Sessions", "Product", "Billing"])
    })
  })
})

describe("curriculum drop in place", () => {
  it("saves nothing when a row is dropped where it already was", async () => {
    const { user } = renderCurriculum()

    await dragWithKeyboard(user, { name: "Sessions", start: "Insert between Sessions and Product", steps: [] })

    await waitFor(() => {
      expect(screen.getByRole("row", { name: "Sessions" })).not.toHaveAttribute("data-dragging")
    })
    expect(reorder).not.toHaveBeenCalled()
    expect(rowTitles()).toStrictEqual(["Foundations", "Boundaries", "Sessions", "Product", "Billing"])
  })
})

describe("curriculum video badges", () => {
  it("shows the progress of an upload in this tab and an upload that stopped", () => {
    const uploads = new Map<string, LocalVideoUpload>([
      ["boundaries", { file: RECORDING, phase: LOCAL_UPLOAD_PHASE.UPLOADING, uploadedBytes: 1 }],
      ["sessions", { error: new Error("offline"), file: RECORDING, phase: LOCAL_UPLOAD_PHASE.FAILED, uploadedBytes: 0 }],
    ])
    localUpload.mockImplementation((lessonId) => uploads.get(lessonId))
    renderCurriculum()

    expect(screen.getByText("Uploading 25%")).toBeVisible()
    expect(screen.getByText(labels.curriculum.video.status.uploading)).toBeVisible()
  })
})
