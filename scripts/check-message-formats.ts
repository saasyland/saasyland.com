import {
  type MessageFormatElement,
  isLiteralElement,
  isPluralElement,
  isPoundElement,
  isSelectElement,
  isTagElement,
  parse,
} from "@formatjs/icu-messageformat-parser"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formOfAddressProblems } from "~/src/lib/forms-of-address"

import { FAILURE_EXIT_CODE } from "./run-command.ts"

const MIN_UNTRANSLATED_WORDS = 5

const MESSAGES_DIR = join(import.meta.dirname, "../messages")
const TRANSLATION_INSTRUCTIONS_PATTERN = /please provide the (?:english |source )?text|I am ready when you are|here is the translation/iu
const TRANSLATION_MARKER_PATTERN = /ZXQ\d+QXZ|<ph\d+|▁|\{"translation":/u
const PATH_PATTERN = /(?<![\w./-])\.?[a-z0-9][\w.@-]*\/[\w.@/-]*/gu
const COMMAND_PATTERN = /\b(?:bun run|bunx|npx|vp) [\w@][\w:@./-]*[\w/]/gu

const flatten = (node: unknown, prefix = ""): [string, string][] => {
  if (typeof node === "string") {
    return [[prefix, node]]
  }

  return Object.entries(node ?? {}).flatMap(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key))
}

const readMessages = (locale: string, file: string): [string, string][] => {
  const path = join(MESSAGES_DIR, locale, file)

  return flatten(JSON.parse(readFileSync(path, "utf8")))
}

const argumentsOf = (nodes: MessageFormatElement[], result = new Set<string>()): string[] => {
  for (const node of nodes) {
    if (!isLiteralElement(node) && !isPoundElement(node)) {
      result.add(`${node.type}:${node.value}`)
    }

    if (isSelectElement(node) || isPluralElement(node)) {
      for (const option of Object.values(node.options)) {
        argumentsOf(option.value, result)
      }
    }

    if (isTagElement(node)) {
      argumentsOf(node.children, result)
    }
  }

  return [...result].toSorted()
}

const literalTextOf = (nodes: MessageFormatElement[]): string =>
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

const codeOf = (text: string): string[] => [...(text.match(PATH_PATTERN) ?? []), ...(text.match(COMMAND_PATTERN) ?? [])]

export const messageProblems = ({ locale, original, value }: { locale: SupportedLocale; original: string; value: string }): string[] => {
  const problems: string[] = []

  try {
    const parsed = parse(value)
    const parsedOriginal = parse(original)
    if (JSON.stringify(argumentsOf(parsedOriginal)) !== JSON.stringify(argumentsOf(parsed))) {
      problems.push("changed ICU arguments or tags")
    }
    const text = literalTextOf(parsed)
    problems.push(
      ...codeOf(literalTextOf(parsedOriginal))
        .filter((code) => !text.includes(code))
        .map((code) => `changed the path or command ${code}`),
      ...formOfAddressProblems({ locale, text }),
    )
    if (locale !== I18N.DEFAULT_LOCALE && value === original && (text.match(/\p{L}+/gu)?.length ?? 0) >= MIN_UNTRANSLATED_WORDS) {
      problems.push("untranslated English text")
    }
  } catch (error) {
    return [String(error)]
  }

  if (value.includes("`") && !original.includes("`")) {
    problems.push("unexpected Markdown code")
  }

  if (TRANSLATION_INSTRUCTIONS_PATTERN.test(value)) {
    problems.push("translation instructions in visible copy")
  }

  if (TRANSLATION_MARKER_PATTERN.test(value)) {
    problems.push("unresolved translation marker")
  }

  return problems
}

export const messageFormatProblems = (): string[] =>
  readdirSync(join(MESSAGES_DIR, I18N.DEFAULT_LOCALE))
    .filter((name) => name.endsWith(".json"))
    .flatMap((file) => {
      const source = new Map(readMessages(I18N.DEFAULT_LOCALE, file))

      return I18N.SUPPORTED_LOCALES.flatMap((locale) =>
        readMessages(locale, file).flatMap(([key, value]) =>
          messageProblems({ locale, original: source.get(key) ?? "", value }).map((problem) => `${locale}/${file}:${key}: ${problem}`),
        ),
      )
    })

if (import.meta.main) {
  const problems = messageFormatProblems()

  if (problems.length > 0) {
    console.error(problems.join("\n"))
    process.exit(FAILURE_EXIT_CODE)
  }

  console.log("✅ Every translated message parses and preserves its ICU arguments, rich-text tags, paths and commands.")
}
