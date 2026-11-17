export const RICH_TEXT_CODE_MARK = "`"

const PARAGRAPH_BREAK = /\n\s*\n/u
const CODE_SPAN = new RegExp(`${RICH_TEXT_CODE_MARK}([^${RICH_TEXT_CODE_MARK}]+)${RICH_TEXT_CODE_MARK}`, "u")
const EVEN = 2

export interface RichTextSegment {
  readonly code: boolean
  readonly text: string
}

const segmentsOf = (paragraph: string): RichTextSegment[] =>
  paragraph
    .split(CODE_SPAN)
    .map((text, index) => ({ code: index % EVEN === 1, text }))
    .filter(({ text }) => text.length > 0)

export const parseRichText = (text: string): RichTextSegment[][] =>
  text
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => segmentsOf(paragraph))
