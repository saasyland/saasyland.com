import type { FontLoader } from "@takumi-rs/core"
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vite-plus/test"

import { FONT_FAMILY, SOCIAL_CARD_FONTS, loadFontFaces, parseUnicodeRange, readFontFaces } from "~/src/integrations/takumi/takumi.fonts"

import { APP_NAME } from "~/src/presentation/branding"

const STYLESHEET = `
@font-face {
  font-family: Geist;
  src: url("/fonts/latin.woff2") format("woff2");
  unicode-range:
    U+??, U+131,
    U+2000-206F;
}

@font-face {
  font-family: 'Noto Sans JP Variable';
  src: url(./files/japanese.woff2) format('woff2-variations');
}

@font-face {
  font-family: Geist Fallback;
  src: local(Arial);
}
`

const FIRST_FONT_URL = /url\("(?<url>[^"]+)"\)/u

const codePoint = (digits: string): number => Number.parseInt(digits, 16)

const describeFace = (face: FontLoader) => {
  if (typeof face !== "object" || !("name" in face)) {
    return { name: undefined, unicodeRange: undefined }
  }

  return { name: face.name, unicodeRange: face.unicodeRange }
}

const readData = (face: FontLoader | undefined): Promise<unknown> => {
  if (typeof face !== "object" || !("data" in face) || typeof face.data !== "function") {
    return Promise.resolve(undefined)
  }

  return Promise.resolve(face.data())
}

describe("parseUnicodeRange", () => {
  it("reads single code points, ranges and wildcards", () => {
    expect(parseUnicodeRange("U+??, U+131, U+2000-206F, U+4??")).toStrictEqual([
      [codePoint("00"), codePoint("FF")],
      [codePoint("131"), codePoint("131")],
      [codePoint("2000"), codePoint("206F")],
      [codePoint("400"), codePoint("4FF")],
    ])
  })

  it("refuses text that is not a unicode range", () => {
    expect(() => parseUnicodeRange("latin")).toThrow()
  })
})

describe("readFontFaces", () => {
  it("registers every face with a file under the site's own family name, with its unicode range", () => {
    expect(readFontFaces(STYLESHEET, "fixtures").map((face) => describeFace(face))).toStrictEqual([
      { name: `${APP_NAME} Geist`, unicodeRange: parseUnicodeRange("U+??, U+131, U+2000-206F") },
      { name: `${APP_NAME} Noto Sans JP Variable`, unicodeRange: undefined },
    ])
  })

  it("reads a face from the file its stylesheet names, relative to the directory the site serves it from", async () => {
    const [face] = readFontFaces('@font-face { font-family: Geist; src: url("/fonts/latin.woff2"); }', "missing-directory")

    await expect(readData(face)).rejects.toThrow("missing-directory/fonts/latin.woff2")
  })

  it("refuses a face without a family", () => {
    expect(() => readFontFaces('@font-face { src: url("/fonts/a.woff2"); }', "public")).toThrow()
  })
})

describe("loadFontFaces", () => {
  it("loads the faces the site serves and the Japanese faces for every family the cards name", async () => {
    const faces = await loadFontFaces()
    const names = new Set(faces.map((face) => describeFace(face).name))

    expect(Object.values(FONT_FAMILY).filter((family) => !names.has(`${APP_NAME} ${family}`))).toStrictEqual([])
  })

  it("reads the site's faces from public/, where the site serves them", async () => {
    const [face] = await loadFontFaces()
    const firstUrl = FIRST_FONT_URL.exec(await readFile("src/presentation/styles/fonts.css", "utf8"))?.groups?.["url"]

    expect(await readData(face)).toStrictEqual(await readFile(`public${firstUrl ?? ""}`))
  })
})

it("stacks the Japanese face behind both card families", () => {
  expect(SOCIAL_CARD_FONTS).toStrictEqual({
    MONO: `"${APP_NAME} Geist Mono", "${APP_NAME} Noto Sans JP Variable"`,
    SANS: `"${APP_NAME} Geist", "${APP_NAME} Noto Sans JP Variable"`,
  })
})
