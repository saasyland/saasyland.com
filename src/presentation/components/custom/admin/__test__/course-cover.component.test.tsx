import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { stubImageEncoding } from "~/src/platform/testing/mocks/canvas"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  COURSE_ICON,
  COURSE_KIND,
  COURSE_LEVEL,
  COURSE_MUTATION_KEYS,
  COURSE_QUERY_KEYS,
  COURSE_STATUS,
} from "~/src/modules/course/course.constants"
import { COURSE_COVER_MAX_BYTES, COURSE_COVER_STORED_TYPES, coverEntries } from "~/src/modules/course/course.cover"
import type { Course } from "~/src/modules/course/course.types"
import type { removeCourseCoverMutation } from "~/src/modules/course/use-cases/remove-course-cover"
import type { uploadCourseCoverMutation } from "~/src/modules/course/use-cases/upload-course-cover"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { CourseCoverCard } from "~/src/presentation/components/custom/admin/courses/course-cover-card"

import validations from "~/messages/en-US/course.validations.json"
import errors from "~/messages/en-US/errors.json"
import labels from "~/messages/en-US/pages.admin.courses.json"

const mocks = vi.hoisted(() => ({
  remove: vi.fn<NonNullable<typeof removeCourseCoverMutation.mutationFn>>(),
  upload: vi.fn<NonNullable<typeof uploadCourseCoverMutation.mutationFn>>(),
}))

vi.mock(import("~/src/modules/course/use-cases/upload-course-cover"), () => ({
  uploadCourseCoverMutation: { mutationFn: mocks.upload, mutationKey: COURSE_MUTATION_KEYS.UPLOAD_COVER },
}))
vi.mock(import("~/src/modules/course/use-cases/remove-course-cover"), () => ({
  removeCourseCoverMutation: { mutationFn: mocks.remove, mutationKey: COURSE_MUTATION_KEYS.REMOVE_COVER },
}))

const { cover: messages } = labels
const COURSE_ID = "01960000-0000-7000-8000-00000000c001"
const COVER = `covers/${COURSE_ID}/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.webp`
const UPDATED_AT = new Date("2026-11-01T12:00:00Z")

const COURSE: Course["select"] = {
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
}

const renderCard = (course: Course["select"] = COURSE) => {
  const queryClient = adminQueryClient()
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  return {
    ...renderAdmin(<CourseCoverCard course={course} />, { path: `/admin/courses/${COURSE_ID}`, queryClient }),
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

const PHOTO = new File([new Uint8Array(2500)], "cover.png", { type: "image/png" })

beforeEach(() => {
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  stubImageEncoding()
  mocks.upload.mockResolvedValue({ cover: COVER })
  mocks.remove.mockResolvedValue({ id: COURSE_ID })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("course cover card", () => {
  it("shows the fallback of a course without a cover and offers only an upload", () => {
    const { container } = renderCard()

    expect(screen.getByRole("heading", { level: 2, name: messages.title })).toBeVisible()
    expect(container.querySelector("[data-slot=course-cover]")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText(/^AVIF, JPEG, PNG, or WEBP, up to 10 MB\. It is cropped to 16:9 and saved at 1600 × 900 pixels/u)).toBeVisible()
    expect(screen.getByRole("button", { name: messages.upload })).toBeVisible()
    expect(screen.queryByRole("button", { name: messages.remove })).toBeNull()
  })

  it("encodes the chosen image at every size and uploads it, after checking that one is chosen", async () => {
    const { invalidateQueries, user } = renderCard()

    await user.click(screen.getByRole("button", { name: messages.upload }))
    expect(await screen.findByText(validations.fileRequired)).toBeVisible()

    await user.upload(fileInput(), PHOTO)
    expect(screen.getByText("cover.png · 2.5 kB")).toBeVisible()
    await user.click(screen.getByRole("button", { name: messages.upload }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(messages.uploaded)
    })
    expect(createImageBitmap).toHaveBeenCalledWith(PHOTO)
    const [form] = mocks.upload.mock.calls[0] ?? []
    if (!(form instanceof FormData)) {
      throw new TypeError("The upload sent no form")
    }
    const entries = coverEntries(form)
    expect(entries.courseId).toBe(COURSE_ID)
    expect(entries.variants.map(({ image, width }) => [width, image instanceof File && image.type])).toStrictEqual([
      [480, COURSE_COVER_STORED_TYPES.webp],
      [960, COURSE_COVER_STORED_TYPES.webp],
      [1600, COURSE_COVER_STORED_TYPES.webp],
    ])
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
    await waitFor(() => {
      expect(screen.queryByText("cover.png · 2.5 kB")).toBeNull()
    })
  })

  it.each([
    { file: new File(["gif"], "cover.gif", { type: "image/gif" }), message: validations.coverTypeUnsupported },
    {
      file: new File([new Uint8Array(COURSE_COVER_MAX_BYTES + 1)], "huge.png", { type: "image/png" }),
      message: validations.coverTooLarge.replace("{max}", "10"),
    },
  ])("refuses $file.name before encoding it", async ({ file, message }) => {
    renderCard()
    const user = userEvent.setup({ applyAccept: false, delay: null })

    await user.upload(fileInput(), file)
    await user.click(screen.getByRole("button", { name: messages.upload }))

    expect(await screen.findByText(message)).toBeVisible()
    expect(createImageBitmap).not.toHaveBeenCalled()
  })

  it("says so when the browser cannot read the image, and uploads nothing", async () => {
    stubImageEncoding({ decodes: false })
    const { user } = renderCard()

    await user.upload(fileInput(), PHOTO)
    await user.click(screen.getByRole("button", { name: messages.upload }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(messages.unreadable)
    })
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("explains an upload that failed and keeps the chosen image", async () => {
    mocks.upload.mockRejectedValueOnce(new Error(ERROR_CODES.TOO_MANY_REQUESTS))
    const { user } = renderCard()

    await user.upload(fileInput(), PHOTO)
    await user.click(screen.getByRole("button", { name: messages.upload }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.TOO_MANY_REQUESTS)
    })
    expect(screen.getByText("cover.png · 2.5 kB")).toBeVisible()
  })

  it("shows the stored cover, replaces it and removes it", async () => {
    const { invalidateQueries, user } = renderCard({ ...COURSE, cover: COVER })

    expect(screen.getByRole("img", { name: "The walkthrough" })).toHaveAttribute("src", `/media/${COVER}`)
    expect(screen.getByRole("button", { name: messages.replace })).toBeVisible()

    await user.click(screen.getByRole("button", { name: messages.remove }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(messages.removed)
    })
    expect(mocks.remove.mock.calls[0]?.[0]).toStrictEqual({ courseId: COURSE_ID })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
  })

  it("explains a removal that failed", async () => {
    mocks.remove.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    const { user } = renderCard({ ...COURSE, cover: COVER })

    await user.click(screen.getByRole("button", { name: messages.remove }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
  })
})
