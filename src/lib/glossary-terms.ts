import { POLISH_NAMES, POLISH_PHRASES, POLISH_TERMS } from "~/src/data/polish-glossary"

export const STEM_MARK = "|"

const WORD_SEPARATOR = " "
const ENDING = String.raw`[\p{Ll}\p{M}']*`
const WORD_BEFORE = String.raw`(?<![\p{L}\p{M}\p{N}_'/-])`
const WORD_AFTER = String.raw`(?![\p{L}\p{M}\p{N}_'/-]|\.[\p{L}\p{N}])`
const SENTENCE_START = String.raw`(?<=(?:(?<![\s\S])|\n[^\S\n]*\n|[.!?…]\s+|[|[]|^[^\S\n]*(?:[#>*+-]+|\d+\.))[^\p{L}\n]*)`
const TYPOGRAPHIC_APOSTROPHE = /’/gu
const LOWERCASE_START = /^\p{Ll}/u

export interface GlossaryTerm {
  readonly meaning: string
  readonly never: string
  readonly pattern: RegExp
  readonly preferred: readonly string[]
}

export interface GlossaryMatch {
  readonly index: number
  readonly term: GlossaryTerm
  readonly word: string
}

export const neverTermText = (term: string): string => term.replaceAll(STEM_MARK, "")

const escape = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)

const capitalized = (text: string): string => text.replace(LOWERCASE_START, (letter) => letter.toUpperCase())

const wordPattern = (word: string): string =>
  word.includes(STEM_MARK) ? `${escape(word.slice(0, word.indexOf(STEM_MARK)))}${ENDING}` : escape(word)

const sentenceStartPattern = (words: string): string =>
  `(?=${capitalized(words.charAt(0))})${SENTENCE_START}${WORD_BEFORE}${capitalized(words)}`

const termPattern = (term: string): RegExp => {
  const words = term
    .split(WORD_SEPARATOR)
    .map((word) => wordPattern(word))
    .join(String.raw`\s+`)
  const alternatives = LOWERCASE_START.test(term) ? [words, sentenceStartPattern(words)] : [words]

  return new RegExp(`(?:${WORD_BEFORE}${alternatives.join("|")})${WORD_AFTER}`, "gmu")
}

const GLOSSARY = [...POLISH_TERMS, ...POLISH_NAMES, ...POLISH_PHRASES]

const PREFERRED = GLOSSARY.flatMap(([, preferred]) => preferred)

const NEVER_TERMS: readonly GlossaryTerm[] = GLOSSARY.flatMap(([meaning, preferred, never]) =>
  never.map((term) => ({ meaning, never: neverTermText(term), pattern: termPattern(term), preferred })),
)

const isPreferredElsewhere = ({ pattern }: GlossaryTerm): boolean => PREFERRED.some((text) => text.search(pattern) >= 0)

export const CHECKED_TERMS = NEVER_TERMS.filter((term) => !isPreferredElsewhere(term))

export const CONTEXT_TERMS = [...new Set(NEVER_TERMS.filter((term) => isPreferredElsewhere(term)).map(({ never }) => never))]

export const glossaryMatches = (text: string): GlossaryMatch[] => {
  const readable = text.replaceAll(TYPOGRAPHIC_APOSTROPHE, "'")
  const matches = CHECKED_TERMS.flatMap((term) =>
    [...readable.matchAll(term.pattern)].map(({ 0: found, index }) => ({ index, term, word: text.slice(index, index + found.length) })),
  ).toSorted((left, right) => left.index - right.index || right.word.length - left.word.length)

  return matches.filter(
    (match, position) =>
      !matches.slice(0, position).some((earlier) => earlier.index + earlier.word.length >= match.index + match.word.length),
  )
}
