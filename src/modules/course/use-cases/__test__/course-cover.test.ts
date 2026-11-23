import { env } from "cloudflare:workers"

import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import {
  COURSE_COVER_MAX_BYTES,
  COURSE_COVER_STORED_TYPES,
  COURSE_COVER_UPLOADS_PER_MINUTE,
  COURSE_COVER_WIDTHS,
  coverFormData,
  coverObjectKeys,
} from "~/src/modules/course/course.cover"
import { course } from "~/src/modules/course/course.schema"
import { applyCourseImport, planCourseImport, readCourseDocument } from "~/src/modules/course/course.transfer"
import { deleteCoursesMutation } from "~/src/modules/course/use-cases/delete-courses"
import { exportCoursesMutation } from "~/src/modules/course/use-cases/export-courses"
import { removeCourseCoverMutation } from "~/src/modules/course/use-cases/remove-course-cover"
import { uploadCourseCoverMutation } from "~/src/modules/course/use-cases/upload-course-cover"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"
const COVER_KEY = /^covers\/01960000-0000-7000-8000-00000000c001\/[\da-f-]{36}\.webp$/u

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const image = (width: number, type: string = COURSE_COVER_STORED_TYPES.webp): File => new File([`cover-${String(width)}`], "blob", { type })

const variants = (type?: string) => COURSE_COVER_WIDTHS.map((width) => ({ image: image(width, type), width }))

const sized = (file: () => File) => COURSE_COVER_WIDTHS.map((width) => ({ image: file(), width }))

const [SMALLEST] = COURSE_COVER_WIDTHS

const upload = (courseId: string = IDS.COURSE, entries = variants()) =>
  executeMutation(uploadCourseCoverMutation, coverFormData({ courseId, variants: entries }))

const storedCover = async (courseId: string = IDS.COURSE): Promise<string | null | undefined> => {
  const [row] = await db.select({ cover: course.cover }).from(course).where(eq(course.id, courseId))
  return row?.cover
}

const storedTexts = (cover: string): Promise<(string | null)[]> =>
  Promise.all(
    coverObjectKeys(cover).map(async (key) => {
      const object = await env.MEDIA.get(key)
      return object && new Response(object.body).text()
    }),
  )

const STORED = COURSE_COVER_WIDTHS.map((width) => `cover-${String(width)}`)
const GONE = COURSE_COVER_WIDTHS.map(() => null)

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("uploadCourseCover", () => {
  it("stores every size of the cover in R2 under the covers prefix and records its key on the course", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const put = vi.spyOn(env.MEDIA, "put")

    const { cover } = await upload()

    expect(cover).toMatch(COVER_KEY)
    await expect(storedCover()).resolves.toBe(cover)
    await expect(storedTexts(cover ?? "")).resolves.toStrictEqual(STORED)
    expect(put.mock.calls.map(([key, , options]) => [key, options])).toStrictEqual(
      coverObjectKeys(cover ?? "").map((key) => [key, { httpMetadata: { contentType: COURSE_COVER_STORED_TYPES.webp } }]),
    )
  })

  it("stores a JPEG cover under a jpg key", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { cover } = await upload(IDS.COURSE, variants(COURSE_COVER_STORED_TYPES.jpg))

    expect(cover).toMatch(/\.jpg$/u)
  })

  it("replaces the cover and deletes the files of the one it replaces", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const first = await upload()

    const second = await upload()

    expect(second.cover).not.toBe(first.cover)
    await expect(storedTexts(first.cover ?? "")).resolves.toStrictEqual(GONE)
    await expect(storedTexts(second.cover ?? "")).resolves.toStrictEqual(STORED)
  })

  it.each([
    { entries: variants("image/gif"), name: "a type it would not serve" },
    {
      entries: [...variants().slice(1), { image: image(SMALLEST, COURSE_COVER_STORED_TYPES.jpg), width: SMALLEST }],
      name: "sizes of different types",
    },
    { entries: variants().slice(1), name: "a missing size" },
    { entries: sized(() => new File([], "blob", { type: COURSE_COVER_STORED_TYPES.webp })), name: "an empty file" },
    {
      entries: sized(() => new File([new Uint8Array(COURSE_COVER_MAX_BYTES + 1)], "blob", { type: COURSE_COVER_STORED_TYPES.webp })),
      name: "a file over the limit",
    },
  ])("refuses $name and stores nothing", async ({ entries }) => {
    signInAs(ROLE_CODES.ADMIN)
    const put = vi.spyOn(env.MEDIA, "put")

    await expect(upload(IDS.COURSE, entries)).rejects.toThrow(ERROR_CODES.VALIDATION)
    expect(put).not.toHaveBeenCalled()
  })

  it("reports a missing course as not found and stores nothing", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const put = vi.spyOn(env.MEDIA, "put")

    await expect(upload(MISSING_ID)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    expect(put).not.toHaveBeenCalled()
  })

  it("deletes what it stored when a size cannot be stored, and keeps the course's cover", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { cover } = await upload()
    vi.spyOn(console, "error").mockImplementation(() => {})
    const remove = vi.spyOn(env.MEDIA, "delete")
    vi.spyOn(env.MEDIA, "put").mockRejectedValueOnce(new Error("R2 is unavailable"))

    await expect(upload()).rejects.toThrow(ERROR_CODES.INTERNAL_ERROR)
    await expect(storedCover()).resolves.toBe(cover)
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove.mock.calls[0]?.[0]).not.toContain(cover)
  })

  it("deletes the stored files of a course deleted while they upload", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const put = env.MEDIA.put.bind(env.MEDIA)
    const keys: string[] = []
    vi.spyOn(env.MEDIA, "put").mockImplementation(async (key, value, options) => {
      keys.push(key)
      await db.delete(course).where(eq(course.id, IDS.COURSE))
      return put(key, value, options)
    })

    await expect(upload()).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    const left = await Promise.all(keys.map((key) => env.MEDIA.head(key)))
    expect(left).toStrictEqual(keys.map(() => null))
  })

  it("limits how often one address uploads", async () => {
    signInAs(ROLE_CODES.ADMIN)
    for (let count = 0; count < COURSE_COVER_UPLOADS_PER_MINUTE; count++) {
      await upload()
    }

    await expect(upload()).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
  })

  it("requires the course update permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(upload()).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("removeCourseCover", () => {
  it("clears the cover and deletes its files", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { cover } = await upload()

    await expect(executeMutation(removeCourseCoverMutation, { courseId: IDS.COURSE })).resolves.toStrictEqual({ id: IDS.COURSE })

    await expect(storedCover()).resolves.toBeNull()
    await expect(storedTexts(cover ?? "")).resolves.toStrictEqual(GONE)
  })

  it("leaves a course without a cover as it is", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const remove = vi.spyOn(env.MEDIA, "delete")

    await executeMutation(removeCourseCoverMutation, { courseId: IDS.COURSE })

    await expect(storedCover()).resolves.toBeNull()
    expect(remove).not.toHaveBeenCalled()
  })

  it("reports a missing course as not found", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(removeCourseCoverMutation, { courseId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("requires the course update permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(removeCourseCoverMutation, { courseId: IDS.COURSE })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("cover files of removed courses", () => {
  it("deletes the cover of a deleted course", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { cover } = await upload()

    await executeMutation(deleteCoursesMutation, { courseIds: [IDS.COURSE] })

    await expect(storedTexts(cover ?? "")).resolves.toStrictEqual(GONE)
  })

  it("deletes the cover of a course an import removes, keeps a kept course's cover and leaves covers out of the file", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { cover } = await upload()
    const exported = await executeMutation(exportCoursesMutation, { courseId: IDS.TUTORIAL })
    const read = readCourseDocument(JSON.stringify(exported))
    if (!("document" in read)) {
      throw new Error("The exported file does not read back")
    }

    const plan = await planCourseImport({ document: read.document, removeMissing: true })
    await applyCourseImport(plan)

    expect(JSON.stringify(exported)).not.toContain("cover")
    expect(plan.objectKeys).toStrictEqual(coverObjectKeys(cover ?? ""))
    await expect(storedTexts(cover ?? "")).resolves.toStrictEqual(GONE)
  })
})
