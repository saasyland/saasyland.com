import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { GERMAN_NAMES, GERMAN_PHRASES, GERMAN_TERMS } from "../data/german-glossary.ts"
import { POLISH_NAMES, POLISH_PHRASES, POLISH_TERMS } from "../data/polish-glossary.ts"

export const STEM_MARK = "|"

const WORD_SEPARATOR = " "
const ENDING = String.raw`[\p{Ll}\p{M}']*`
const WORD_BEFORE = String.raw`(?<![\p{L}\p{M}\p{N}_'/-])`
const WORD_AFTER = String.raw`(?![\p{L}\p{M}\p{N}_'/-]|\.[\p{L}\p{N}])`
const SENTENCE_START = String.raw`(?<=(?:(?<![\s\S])|\n[^\S\n]*\n|[.!?…]\s+|[|[]|^[^\S\n]*(?:[#>*+-]+|\d+\.))[^\p{L}\n]*)`
const TYPOGRAPHIC_APOSTROPHE = /’/gu
const LOWERCASE_START = /^\p{Ll}/u

type GlossaryRow = readonly [meaning: string, preferred: readonly string[], never: readonly string[]]

type Quotation = readonly [open: string, close: string]

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

export interface Glossary {
  readonly checkedTerms: readonly GlossaryTerm[]
  readonly contextTerms: readonly string[]
  readonly englishNote: string
  readonly language: string
  readonly locale: SupportedLocale
  readonly quotations: readonly Quotation[]
  readonly rows: readonly GlossaryRow[]
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

const glossary = ({ rows, ...language }: Omit<Glossary, "checkedTerms" | "contextTerms">): Glossary => {
  const preferredTerms = rows.flatMap(([, preferred]) => preferred)
  const neverTerms = rows.flatMap(([meaning, preferred, never]) =>
    never.map((term) => ({ meaning, never: neverTermText(term), pattern: termPattern(term), preferred })),
  )
  const isPreferredElsewhere = ({ pattern }: GlossaryTerm): boolean => preferredTerms.some((text) => text.search(pattern) >= 0)

  return {
    ...language,
    checkedTerms: neverTerms.filter((term) => !isPreferredElsewhere(term)),
    contextTerms: [...new Set(neverTerms.filter((term) => isPreferredElsewhere(term)).map(({ never }) => never))],
    rows,
  }
}

export const GERMAN_GLOSSARY = glossary({
  englishNote: "engl.",
  language: "German",
  locale: "de-DE",
  quotations: [
    ["„", "“"],
    ["‚", "‘"],
  ],
  rows: [...GERMAN_TERMS, ...GERMAN_NAMES, ...GERMAN_PHRASES],
})

export const POLISH_GLOSSARY = glossary({
  englishNote: "ang.",
  language: "Polish",
  locale: "pl-PL",
  quotations: [["„", "”"]],
  rows: [...POLISH_TERMS, ...POLISH_NAMES, ...POLISH_PHRASES],
})

export const GLOSSARIES = [GERMAN_GLOSSARY, POLISH_GLOSSARY]

export const glossaryMatches = ({ checkedTerms }: Glossary, text: string): GlossaryMatch[] => {
  const readable = text.replaceAll(TYPOGRAPHIC_APOSTROPHE, "'")
  const matches = checkedTerms
    .flatMap((term) =>
      [...readable.matchAll(term.pattern)].map(({ 0: found, index }) => ({ index, term, word: text.slice(index, index + found.length) })),
    )
    .toSorted((left, right) => left.index - right.index || right.word.length - left.word.length)

  return matches.filter(
    (match, position) =>
      !matches.slice(0, position).some((earlier) => earlier.index + earlier.word.length >= match.index + match.word.length),
  )
}
