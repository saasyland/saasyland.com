import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_DOCUMENT, COURSE_IMPORT_PROBLEMS_MAX, COURSE_MUTATION_KEYS, COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import type { exportCoursesMutation } from "~/src/modules/course/use-cases/export-courses"
import type { importCoursesMutation } from "~/src/modules/course/use-cases/import-courses"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { ExportCoursesButton } from "~/src/presentation/components/custom/admin/courses/export-courses-button"
import { ImportCoursesDialog } from "~/src/presentation/components/custom/admin/courses/import-courses-dialog"

import validations from "~/messages/en-US/course.validations.json"
import errors from "~/messages/en-US/errors.json"
import labels from "~/messages/en-US/pages.admin.courses.json"

const exportCourses = vi.hoisted(() => vi.fn<NonNullable<typeof exportCoursesMutation.mutationFn>>())
const importCourses = vi.hoisted(() => vi.fn<NonNullable<typeof importCoursesMutation.mutationFn>>())

vi.mock(import("~/src/modules/course/use-cases/export-courses"), () => ({
  exportCoursesMutation: { mutationFn: exportCourses, mutationKey: COURSE_MUTATION_KEYS.EXPORT },
}))
vi.mock(import("~/src/modules/course/use-cases/import-courses"), () => ({
  importCoursesMutation: { mutationFn: importCourses, mutationKey: COURSE_MUTATION_KEYS.IMPORT },
}))

const DOCUMENT: Course["courseDocument"] = { courses: [], format: COURSE_DOCUMENT.FORMAT, version: COURSE_DOCUMENT.VERSION }
const FILE_TEXT = JSON.stringify(DOCUMENT)
const EXPORTED = /^courses-\d{4}-\d{2}-\d{2}\.json$/u
const { transfer } = labels

type Tallies = Extract<Course["importResult"], { tallies: unknown }>["tallies"]

const tally = (counts: Partial<Tallies["courses"]> = {}) => ({ create: 0, keep: 0, remove: 0, unchanged: 0, update: 0, ...counts })

const TALLIES: Tallies = {
  chapters: tally({ create: 16 }),
  courses: tally({ create: 5 }),
  lessons: tally({ create: 74 }),
  links: tally(),
}

const PLAN: Course["importResult"] = { changes: 95, files: 0, tallies: TALLIES, warnings: [] }

const blobs: Blob[] = []

const createObjectURL = vi.fn((object: Blob | MediaSource) => {
  if (object instanceof Blob) {
    blobs.push(object)
  }
  return "blob:course-export"
})

const revokeObjectURL = vi.fn<(url: string) => void>()

class DownloadUrl extends URL {
  static override createObjectURL = createObjectURL
  static override revokeObjectURL = revokeObjectURL
}

const spyOnClicks = () => vi.spyOn(HTMLAnchorElement.prototype, "click").mockReturnValue()

let clicks = spyOnClicks()

const savedNames = (): string[] =>
  clicks.mock.contexts.filter((context) => context instanceof HTMLAnchorElement).map(({ download }) => download)

const renderTransfer = () => {
  const queryClient = adminQueryClient()
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  return {
    ...renderAdmin(
      <>
        <ImportCoursesDialog />
        <ExportCoursesButton />
        <ExportCoursesButton course={{ id: "course-id", slug: "the-walkthrough" }} />
      </>,
      { path: "/admin/courses", queryClient },
    ),
    invalidateQueries,
    user: userEvent.setup({ delay: null }),
  }
}

const openImport = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: transfer.import }))
  return within(await screen.findByRole("dialog"))
}

const fileInput = (): HTMLInputElement => {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")
  if (input === null) {
    throw new Error("Missing file input")
  }
  return input
}

const chooseFile = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.upload(fileInput(), new File([FILE_TEXT], "courses.json", { type: "application/json" }))
  expect(await screen.findByText("courses.json")).toBeVisible()
}

beforeEach(() => {
  vi.clearAllMocks()
  blobs.length = 0
  exportCourses.mockResolvedValue(DOCUMENT)
  importCourses.mockResolvedValue(PLAN)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  vi.stubGlobal("URL", DownloadUrl)
  clicks = spyOnClicks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("exporting courses", () => {
  it("saves every course as a dated JSON file", async () => {
    const { user } = renderTransfer()

    await user.click(screen.getByRole("button", { name: transfer.exportAll }))

    await waitFor(() => {
      expect(savedNames()).toHaveLength(1)
    })
    const [name] = savedNames()
    expect(exportCourses.mock.calls[0]?.[0]).toStrictEqual({})
    expect(name).toMatch(EXPORTED)
    expect(await blobs[0]?.text()).toBe(`${JSON.stringify(DOCUMENT, undefined, 2)}\n`)
    expect(toast.success).toHaveBeenCalledWith(transfer.exported.replace("{fileName}", name ?? ""))
    await waitFor(() => {
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:course-export")
    })
  })

  it("saves one course under its slug", async () => {
    const { user } = renderTransfer()

    await user.click(screen.getByRole("button", { name: transfer.export }))

    await waitFor(() => {
      expect(savedNames()[0]).toMatch(/^the-walkthrough-\d{4}-\d{2}-\d{2}\.json$/u)
    })
    expect(exportCourses.mock.calls[0]?.[0]).toStrictEqual({ courseId: "course-id" })
  })

  it("explains an export that failed", async () => {
    exportCourses.mockRejectedValueOnce(new Error(ERROR_CODES.FORBIDDEN))
    const { user } = renderTransfer()

    await user.click(screen.getByRole("button", { name: transfer.exportAll }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.FORBIDDEN)
    })
    expect(savedNames()).toStrictEqual([])
  })
})

describe("importing courses", () => {
  it("checks the file, shows what it will change, then imports it", async () => {
    const { invalidateQueries, user } = renderTransfer()
    const dialog = await openImport(user)
    expect(dialog.getByText(transfer.dialog.files)).toBeVisible()

    await user.click(dialog.getByRole("button", { name: transfer.dialog.check }))
    expect(await dialog.findByText(validations.documentRequired)).toBeVisible()
    expect(dialog.getByRole("button", { name: transfer.dialog.confirm })).toBeDisabled()

    await chooseFile(user)
    await user.click(dialog.getByRole("button", { name: transfer.dialog.check }))

    expect(await dialog.findByText(transfer.plan.title)).toBeVisible()
    expect(importCourses.mock.calls[0]?.[0]).toStrictEqual({ document: FILE_TEXT, dryRun: true, removeMissing: false })
    expect(dialog.getByText("5 to add, 0 to update, 0 unchanged, 0 to remove, 0 not in the file and kept")).toBeVisible()
    expect(dialog.getByText("74 to add, 0 to update, 0 unchanged, 0 to remove, 0 not in the file and kept")).toBeVisible()

    await user.click(dialog.getByRole("button", { name: transfer.dialog.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(transfer.dialog.imported)
    })
    expect(importCourses.mock.calls[1]?.[0]).toStrictEqual({ document: FILE_TEXT, dryRun: false, removeMissing: false })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("checks again after the remove option changes, and names what removal deletes", async () => {
    const { user } = renderTransfer()
    const dialog = await openImport(user)
    await chooseFile(user)
    await user.click(dialog.getByRole("button", { name: transfer.dialog.check }))
    expect(await dialog.findByText(transfer.plan.title)).toBeVisible()

    importCourses.mockResolvedValueOnce({
      changes: 3,
      files: 2,
      tallies: { ...TALLIES, courses: tally({ remove: 1 }) },
      warnings: [{ course: "the-walkthrough", lesson: "billing", videoId: "missing-video" }],
    })
    await user.click(dialog.getByRole("checkbox", { name: transfer.dialog.removeMissing }))
    expect(dialog.queryByText(transfer.plan.title)).toBeNull()
    await user.click(dialog.getByRole("button", { name: transfer.dialog.check }))

    expect(await dialog.findByText("2 uploaded files are deleted with their lessons.")).toBeVisible()
    expect(
      dialog.getByText("the-walkthrough, billing: video missing-video is not in this library, so the lesson keeps its current video."),
    ).toBeVisible()
    expect(importCourses.mock.calls[1]?.[0]).toStrictEqual({ document: FILE_TEXT, dryRun: true, removeMissing: true })
  })

  it("says when the courses already match the file and offers nothing to import", async () => {
    importCourses.mockResolvedValueOnce({ changes: 0, files: 0, tallies: TALLIES, warnings: [] })
    const { user } = renderTransfer()
    const dialog = await openImport(user)
    await chooseFile(user)

    await user.click(dialog.getByRole("button", { name: transfer.dialog.check }))

    expect(await dialog.findByText(transfer.plan.noChanges)).toBeVisible()
    expect(dialog.getByRole("button", { name: transfer.dialog.confirm })).toBeDisabled()
  })

  it("lists the problems that stop an import", async () => {
    importCourses.mockResolvedValueOnce({
      problemCount: COURSE_IMPORT_PROBLEMS_MAX + 2,
      problems: [
        { message: "documentFormat", path: "" },
        { message: "slugInvalid", path: "courses.0.slug" },
        { message: "Invalid input", path: "courses.1.kind" },
      ],
    })
    const { user } = renderTransfer()
    const dialog = await openImport(user)
    await chooseFile(user)

    await user.click(dialog.getByRole("button", { name: transfer.dialog.check }))

    const alert = within(await dialog.findByRole("alert"))
    expect(alert.getByText(`The file has ${String(COURSE_IMPORT_PROBLEMS_MAX + 2)} problems, so nothing can be imported:`)).toBeVisible()
    expect(alert.getByText(validations.documentFormat)).toBeVisible()
    expect(alert.getByText("courses.0.slug")).toBeVisible()
    expect(alert.getByText(validations.valueInvalid, { exact: false })).toBeVisible()
    expect(alert.getByText(`and ${String(COURSE_IMPORT_PROBLEMS_MAX - 1)} more problems`)).toBeVisible()
    expect(dialog.getByRole("button", { name: transfer.dialog.confirm })).toBeDisabled()
  })

  it("keeps the dialog open when the check fails, and starts over when reopened", async () => {
    importCourses.mockRejectedValueOnce(new Error(ERROR_CODES.TOO_MANY_REQUESTS))
    const { user } = renderTransfer()
    let dialog = await openImport(user)
    await chooseFile(user)
    fireEvent.change(fileInput(), { target: { files: [] } })

    await user.click(dialog.getByRole("button", { name: transfer.dialog.check }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.TOO_MANY_REQUESTS)
    })
    await user.keyboard("{Escape}")
    dialog = await openImport(user)
    expect(dialog.queryByText("courses.json")).toBeNull()
  })
})
