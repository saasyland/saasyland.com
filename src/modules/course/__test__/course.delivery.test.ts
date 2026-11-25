import { env } from "cloudflare:workers"

import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createEdgeCache } from "~/src/platform/testing/mocks/cache"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { chapter } from "~/src/modules/chapter/chapter.schema"
import { IDS, LESSON_IDS, makeTextLesson, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { coverVariantKey } from "~/src/modules/course/course.cover"
import { serveCourseSitemap, serveCover } from "~/src/modules/course/course.delivery"
import { course } from "~/src/modules/course/course.schema"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

import { APP_URL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

const ORIGIN = "https://saasyland.test"
const COVER = "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.webp"
const SMALL = coverVariantKey(COVER, 480)
const BYTES = "RIFF-cover"

const request = (key: string, init?: RequestInit): Promise<Response> => serveCover(new Request(`${ORIGIN}/media/${key}`, init))

let edge = createEdgeCache()

beforeEach(async () => {
  edge = createEdgeCache()
  await env.MEDIA.put(COVER, BYTES)
  await env.MEDIA.put(SMALL, BYTES)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("serveCover", () => {
  it("serves each size of a cover with its type and a public, immutable cache policy", async () => {
    for (const key of [COVER, SMALL]) {
      const response = await request(key)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe(BYTES)
      expect(Object.fromEntries(response.headers)).toMatchObject({
        "cache-control": "public, max-age=31536000, immutable",
        "content-length": String(BYTES.length),
        "content-type": "image/webp",
      })
    }
  })

  it("keeps a copy at the edge and serves repeats from it without reading R2", async () => {
    await request(COVER)
    await flushWaitUntil()
    expect(edge.entries.has(`${ORIGIN}/media/${COVER}`)).toBe(true)

    const get = vi.spyOn(env.MEDIA, "get")
    const repeat = await request(COVER)

    expect(await repeat.text()).toBe(BYTES)
    expect(get).not.toHaveBeenCalled()
  })

  it("answers HEAD with the headers alone", async () => {
    const response = await request(COVER, { method: "HEAD" })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-length")).toBe(String(BYTES.length))
    expect(await response.text()).toBe("")
  })

  it.each(["GET", "HEAD"])("reports a cover that is not stored as not found on %s", async (method) => {
    const response = await request(COVER.replace("c0e1", "c0e2"), { method })

    expect(response.status).toBe(404)
  })

  it.each([
    "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.gif",
    "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/notes.webp",
    "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1/../x.webp",
  ])("refuses a path that is no cover: %s", async (key) => {
    const get = vi.spyOn(env.MEDIA, "get")

    const response = await request(key)

    expect(response.status).toBe(404)
    expect(get).not.toHaveBeenCalled()
  })

  it("allows only GET and HEAD", async () => {
    const response = await request(COVER, { method: "POST" })

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
  })
})

const SITEMAP_ENTRY = /<url>\s*<loc>(?<url>[^<]+)<\/loc>\s*<lastmod>(?<lastmod>[^<]+)<\/lastmod>/gu
const BASE_TIME = new Date("2026-01-01T00:00:00.000Z")

const requestSitemap = (init?: RequestInit, path: string = ROUTES.COURSES_SITEMAP): Promise<Response> =>
  serveCourseSitemap(new Request(`${ORIGIN}${path}`, init))

const readSitemap = async (): Promise<Record<string, string>> => {
  const response = await requestSitemap()

  const xml = await response.text()

  return Object.fromEntries(Array.from(xml.matchAll(SITEMAP_ENTRY), ({ groups }) => [groups?.["url"] ?? "", groups?.["lastmod"] ?? ""]))
}

const inEveryLocale = (pathname: string, lastmod: string): [string, string][] =>
  I18N.SUPPORTED_LOCALES.map((locale) => [
    locale === I18N.DEFAULT_LOCALE ? `${APP_URL}${pathname}` : `${APP_URL}/${locale}${pathname}`,
    lastmod,
  ])

describe("serveCourseSitemap", () => {
  beforeEach(async () => {
    await seedCatalogue()
    await Promise.all([
      db.update(course).set({ updatedAt: BASE_TIME }),
      db.update(chapter).set({ updatedAt: BASE_TIME }),
      db.update(lesson).set({ updatedAt: BASE_TIME }),
      db.update(video).set({ updatedAt: BASE_TIME }),
    ])
  })

  it("lists the catalogue, every published course and the lessons a visitor may watch, each in every locale with the day it last changed", async () => {
    await Promise.all([
      db
        .update(chapter)
        .set({ updatedAt: new Date("2026-02-01T12:00:00.000Z") })
        .where(eq(chapter.id, IDS.CHAPTER_ONE)),
      db
        .update(video)
        .set({ updatedAt: new Date("2026-03-01T12:00:00.000Z") })
        .where(eq(video.id, IDS.VIDEO)),
      db
        .update(lesson)
        .set({ updatedAt: new Date("2026-04-01T12:00:00.000Z") })
        .where(eq(lesson.id, LESSON_IDS.PAID_WITHOUT_VIDEO)),
      db
        .update(lesson)
        .set({ updatedAt: new Date("2027-01-01T12:00:00.000Z") })
        .where(eq(lesson.id, LESSON_IDS.DRAFT)),
      db
        .update(course)
        .set({ updatedAt: new Date("2026-01-15T12:00:00.000Z") })
        .where(eq(course.id, IDS.TUTORIAL)),
    ])

    expect(await readSitemap()).toStrictEqual(
      Object.fromEntries([
        ...inEveryLocale(ROUTES.COURSES, "2026-04-01"),
        ...inEveryLocale(`${ROUTES.COURSES}/one-off`, "2026-01-15"),
        ...inEveryLocale(`${ROUTES.COURSES}/the-walkthrough`, "2026-04-01"),
        ...inEveryLocale(`${ROUTES.COURSES}/the-walkthrough/boundaries`, "2026-03-01"),
      ]),
    )
  })

  it("dates a lesson without a video by the lesson alone", async () => {
    await makeTextLesson(LESSON_IDS.PREVIEW)
    await db
      .update(lesson)
      .set({ updatedAt: new Date("2026-05-01T00:00:00.000Z") })
      .where(eq(lesson.id, LESSON_IDS.PREVIEW))

    expect(await readSitemap()).toMatchObject(
      Object.fromEntries(inEveryLocale(`${ROUTES.COURSES}/the-walkthrough/boundaries`, "2026-05-01")),
    )
  })

  it("lists nothing while no course is published", async () => {
    await db.update(course).set({ status: COURSE_STATUS.DRAFT })

    expect(await readSitemap()).toStrictEqual({})
  })

  it("answers as XML that may be cached for an hour, and HEAD with the headers alone", async () => {
    const [get, head] = await Promise.all([requestSitemap(), requestSitemap({ method: "HEAD" })])

    for (const response of [get, head]) {
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8")
      expect(response.headers.get("cache-control")).toBe("public, max-age=3600")
    }
    expect(await head.text()).toBe("")
  })

  it("allows only GET and HEAD and knows no other path", async () => {
    const [post, other] = await Promise.all([
      requestSitemap({ method: "POST" }),
      requestSitemap(undefined, `${ROUTES.COURSES_SITEMAP}/more`),
    ])

    expect(post.status).toBe(405)
    expect(other.status).toBe(404)
  })
})
