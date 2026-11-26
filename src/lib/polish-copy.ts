import {
  type MessageFormatElement,
  isLiteralElement,
  isPluralElement,
  isSelectElement,
  isTagElement,
  parse,
} from "@formatjs/icu-messageformat-parser"
import { isScalar, parseDocument, visit } from "yaml"
import * as zod from "zod"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { glossaryMatches } from "~/src/lib/glossary-terms"

export const POLISH_LOCALE = "pl-PL" satisfies SupportedLocale

const PROSE_FIELDS = new Set(["answer", "description", "excerpt", "question", "title", "unreleased"])

const FRONTMATTER_OPEN = "---\n"
const FRONTMATTER_CLOSE = "\n---"
const FRONTMATTER = /^---\n[\s\S]*?\n---(?=\n|$)/u
const NOT_LINE_BREAK = /[^\n]/gu
const JSON_STRING = /"(?:[^"\\]|\\.)*"(?:\s*:)?/gu
const JSON_KEY_END = /\s*:$/u
const COMPONENT_TAG = /<\/?[A-Za-z][\w.:-]*(?:\s+[\w:-]+(?:=(?:"[^"]*"|'[^']*'|\{[^}]*\}))?)*\s*\/?>/gu
const PROSE_PROP = /\b(?:description|excerpt|title|unreleased)="(?<value>[^"]*)"/gu

const NODE_RANGE = zod.tuple([zod.number(), zod.number(), zod.number()])

const NON_PROSE = [
  /^(?<fence>`{3,}|~{3,})[^\n]*\n[\s\S]*?^\k<fence>[^\S\n]*$/gmu,
  /`[^`\n]+`/gu,
  /^(?:import|export)\s[^\n]*$/gmu,
  /^\[[^\]\n]+\]:[^\n]*$/gmu,
  /(?<=\])\([^)\n]*\)/gu,
  /\[#[^\]\n]*\]/gu,
  /\{\s*[\w.]+(?=\s*,)/gu,
  /\(ang\.\s[^)]*\)/gu,
  /\bhttps?:\/\/[^\s<>)]+/gu,
  /„(?:[^”\n]|\n(?![^\S\n]*\n))*”/gu,
  /“(?:[^”\n]|\n(?![^\S\n]*\n))*”/gu,
  /»[^«\n]*«/gu,
] as const

export interface PolishCopyProblem {
  readonly line: number
  readonly meaning: string
  readonly never: string
  readonly preferred: readonly string[]
  readonly word: string
}

interface JsonString {
  readonly index: number
  readonly key: string
  readonly value: string
}

const blank = (text: string): string => text.replaceAll(NOT_LINE_BREAK, " ")

const proseProps = (tag: string): string =>
  [...tag.matchAll(PROSE_PROP)].reduce((kept, { 0: prop, index }) => {
    const start = index + prop.indexOf('"') + 1
    const end = index + prop.length - 1

    return `${kept.slice(0, start)}${tag.slice(start, end)}${kept.slice(end)}`
  }, blank(tag))

export const readableProse = (text: string): string =>
  NON_PROSE.reduce<string>((prose, pattern) => prose.replaceAll(pattern, blank), text.replaceAll(COMPONENT_TAG, proseProps))

const frontmatterFields = (yaml: string): (readonly [start: number, end: number])[] => {
  const fields: (readonly [number, number])[] = []

  visit(parseDocument(yaml), {
    Pair: (_, { key, value }) => {
      if (isScalar(key) && PROSE_FIELDS.has(String(key.value)) && isScalar(value)) {
        const [start, end] = NODE_RANGE.parse(value.range)

        fields.push([start, end])
      }
    },
  })

  return fields
}

const lineAt = (text: string, index: number): number => text.slice(0, index).split("\n").length

const problemsIn = (prose: string, line: (index: number) => number): PolishCopyProblem[] =>
  glossaryMatches(prose).map(({ index, term: { meaning, never, preferred }, word }) => ({
    line: line(index),
    meaning,
    never,
    preferred,
    word,
  }))

export const literalTextOf = (nodes: readonly MessageFormatElement[]): string =>
  nodes
    .map((node) => {
      if (isLiteralElement(node)) {
        return node.value
      }
      if (isSelectElement(node) || isPluralElement(node)) {
        return Object.values(node.options)
          .map((option) => literalTextOf(option.value))
          .join(" ")
      }
      if (isTagElement(node)) {
        return literalTextOf(node.children)
      }

      return " "
    })
    .join("")

const jsonStrings = (source: string): JsonString[] => {
  const strings: JsonString[] = []
  let key = ""

  for (const { 0: token, index } of source.matchAll(JSON_STRING)) {
    const text = zod.string().parse(JSON.parse(token.replace(JSON_KEY_END, "")))

    if (JSON_KEY_END.test(token)) {
      key = text
    } else {
      strings.push({ index, key, value: text })
    }
  }

  return strings
}

const jsonProblems = (source: string, strings: readonly JsonString[], prose: (value: string) => string): PolishCopyProblem[] =>
  strings.flatMap(({ index, value }) => problemsIn(readableProse(prose(value)), () => lineAt(source, index)))

export const messageFileProblems = (source: string): PolishCopyProblem[] =>
  jsonProblems(source, jsonStrings(source), (value) => literalTextOf(parse(value)))

export const courseFileProblems = (source: string): PolishCopyProblem[] =>
  jsonProblems(
    source,
    jsonStrings(source).filter(({ key }) => key === POLISH_LOCALE),
    (value) => value,
  )

export const metaFileProblems = (source: string): PolishCopyProblem[] =>
  jsonProblems(
    source,
    jsonStrings(source).filter(({ key }) => PROSE_FIELDS.has(key)),
    (value) => value,
  )

export const mdxFileProblems = (source: string): PolishCopyProblem[] => {
  const frontmatter = FRONTMATTER.exec(source)?.[0] ?? ""
  const body = `${blank(frontmatter)}${source.slice(frontmatter.length)}`
  const fields = frontmatterFields(frontmatter.slice(FRONTMATTER_OPEN.length, -FRONTMATTER_CLOSE.length))

  return [
    ...fields.flatMap(([start, end]) =>
      problemsIn(readableProse(source.slice(FRONTMATTER_OPEN.length + start, FRONTMATTER_OPEN.length + end)), (index) =>
        lineAt(source, FRONTMATTER_OPEN.length + start + index),
      ),
    ),
    ...problemsIn(readableProse(body), (index) => lineAt(body, index)),
  ]
}

export const formatPolishCopyProblem = (file: string, { line, meaning, never, preferred, word }: PolishCopyProblem): string =>
  `${file}:${String(line)}: „${word}” is „${never}”, which Polish copy never writes for “${meaning}”; write ${preferred.map((term) => `„${term}”`).join(" or ")}`
