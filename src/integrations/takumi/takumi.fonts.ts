import type { FontLoader } from "@takumi-rs/core"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import zod from "zod/v4"

import { APP_NAME } from "~/src/presentation/branding"

const FONT_FACE = /@font-face\s*\{(?<body>[^}]*)\}/gu
const FAMILY = /font-family:\s*["']?(?<family>[^;"']+?)["']?\s*;/u
const SOURCE = /src:\s*url\(["']?(?<url>[^"')]+)["']?\)/u
const UNICODE_RANGE = /unicode-range:\s*(?<ranges>[^;]+);/u
const CODE_POINTS = /^U\+(?<first>[\da-f?]+)(?:-(?<last>[\da-f]+))?$/iu
const RANGE_LIST_SEPARATOR = ","
const WILDCARD = /\?/gu
const HEXADECIMAL = 16
const LOWEST_DIGIT = "0"
const HIGHEST_DIGIT = "F"

const JAPANESE_FONT_PACKAGE = "node_modules/@fontsource-variable/noto-sans-jp"

export const FONT_SOURCES = [
  { directory: "public", stylesheet: "src/presentation/styles/fonts.css" },
  { directory: JAPANESE_FONT_PACKAGE, stylesheet: `${JAPANESE_FONT_PACKAGE}/index.css` },
] as const

export const FONT_FAMILY = {
  JAPANESE: "Noto Sans JP Variable",
  MONO: "Geist Mono",
  SANS: "Geist",
} as const

const fontFaceBlockSchema = zod.object({ body: zod.string() })
const fontFaceSchema = zod.object({ family: zod.string(), ranges: zod.string().optional(), url: zod.string().optional() })
const codePointsSchema = zod.object({ first: zod.string(), last: zod.string().optional() })

const registeredFamily = (family: string): string => `${APP_NAME} ${family}`

const familyStack = (...families: readonly string[]): string => families.map((family) => `"${registeredFamily(family)}"`).join(", ")

export const SOCIAL_CARD_FONTS = {
  MONO: familyStack(FONT_FAMILY.MONO, FONT_FAMILY.JAPANESE),
  SANS: familyStack(FONT_FAMILY.SANS, FONT_FAMILY.JAPANESE),
} as const

const codePoint = (digits: string, wildcard: string): number => Number.parseInt(digits.replaceAll(WILDCARD, wildcard), HEXADECIMAL)

const toRange = (range: string): [number, number] => {
  const { first, last } = codePointsSchema.parse(CODE_POINTS.exec(range.trim())?.groups)

  return [codePoint(first, LOWEST_DIGIT), codePoint(last ?? first, HIGHEST_DIGIT)]
}

export const parseUnicodeRange = (ranges: string): [number, number][] => ranges.split(RANGE_LIST_SEPARATOR).map((range) => toRange(range))

const readFontFace = (body: string, directory: string): FontLoader[] => {
  const { family, ranges, url } = fontFaceSchema.parse({
    ...FAMILY.exec(body)?.groups,
    ...SOURCE.exec(body)?.groups,
    ...UNICODE_RANGE.exec(body)?.groups,
  })

  if (url === undefined) {
    return []
  }

  return [
    {
      data: () => readFile(join(directory, url)),
      name: registeredFamily(family),
      ...(ranges === undefined ? {} : { unicodeRange: parseUnicodeRange(ranges) }),
    },
  ]
}

export const readFontFaces = (stylesheet: string, directory: string): FontLoader[] =>
  Array.from(stylesheet.matchAll(FONT_FACE), ({ groups }) => readFontFace(fontFaceBlockSchema.parse(groups).body, directory)).flat()

export const loadFontFaces = async (): Promise<FontLoader[]> => {
  const faces = await Promise.all(
    FONT_SOURCES.map(async ({ directory, stylesheet }) => readFontFaces(await readFile(stylesheet, "utf8"), directory)),
  )

  return faces.flat()
}
