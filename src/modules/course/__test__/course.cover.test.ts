import { describe, expect, it } from "vite-plus/test"

import {
  COURSE_COVER_STORED_TYPES,
  COVER_SIZES,
  courseCoverImage,
  coverContentType,
  coverEntries,
  coverExtension,
  coverFormData,
  coverObjectKey,
  coverObjectKeys,
} from "~/src/modules/course/course.cover"

const COURSE_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000c0c0"
const COVER_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000c0e1"
const COVER = `covers/${COURSE_ID}/${COVER_ID}.webp`

describe("course cover keys", () => {
  it("keys a cover by its course and its own id, with each smaller size beside it", () => {
    expect(coverObjectKey({ courseId: COURSE_ID, coverId: COVER_ID, extension: "webp" })).toBe(COVER)
    expect(coverObjectKeys(COVER)).toStrictEqual([
      `covers/${COURSE_ID}/${COVER_ID}-480.webp`,
      `covers/${COURSE_ID}/${COVER_ID}-960.webp`,
      COVER,
    ])
  })

  it("keeps 16:9 at every size", () => {
    expect(COVER_SIZES).toStrictEqual([
      { height: 270, width: 480 },
      { height: 540, width: 960 },
      { height: 900, width: 1600 },
    ])
  })

  it("maps the stored image types to their extensions and back", () => {
    expect(coverExtension(COURSE_COVER_STORED_TYPES.webp)).toBe("webp")
    expect(coverExtension(COURSE_COVER_STORED_TYPES.jpg)).toBe("jpg")
    expect(coverExtension("image/png")).toBeUndefined()
    expect(coverContentType(COVER)).toBe(COURSE_COVER_STORED_TYPES.webp)
    expect(coverContentType(`covers/${COURSE_ID}/${COVER_ID}-480.jpg`)).toBe(COURSE_COVER_STORED_TYPES.jpg)
    expect(coverContentType(`covers/${COURSE_ID}/${COVER_ID}.gif`)).toBeUndefined()
  })
})

describe("courseCoverImage", () => {
  it("serves a stored cover under the media path with a source for each size", () => {
    expect(courseCoverImage(COVER)).toStrictEqual({
      src: `/media/${COVER}`,
      srcSet: [
        `/media/covers/${COURSE_ID}/${COVER_ID}-480.webp 480w`,
        `/media/covers/${COURSE_ID}/${COVER_ID}-960.webp 960w`,
        `/media/${COVER} 1600w`,
      ].join(", "),
    })
  })
})

describe("cover uploads", () => {
  it("reads back each size of the form it builds, and a missing size as null", () => {
    const image = new Blob(["cover"], { type: COURSE_COVER_STORED_TYPES.webp })
    const form = coverFormData({ courseId: COURSE_ID, variants: [{ image, width: 960 }] })

    const entries = coverEntries(form)

    expect(entries.courseId).toBe(COURSE_ID)
    expect(entries.variants.map(({ image: entry, width }) => [width, entry instanceof File])).toStrictEqual([
      [480, false],
      [960, true],
      [1600, false],
    ])
    expect(entries.variants[0]?.image).toBeNull()
  })
})
