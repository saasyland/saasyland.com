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

const FAILURE_EXIT_CODE = 1
const MIN_UNTRANSLATED_WORDS = 5

const MESSAGES_DIR = join(import.meta.dirname, "../messages")
const TRANSLATION_INSTRUCTIONS_PATTERN = /please provide the (?:english |source )?text|I am ready when you are|here is the translation/iu
const TRANSLATION_MARKER_PATTERN = /ZXQ\d+QXZ|<ph\d+|▁|\{"translation":/u

const flatten = (node: unknown, prefix = ""): [string, string][] =>
  typeof node === "string"
    ? [[prefix, node]]
    : Object.entries(node ?? {}).flatMap(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key))

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

const messageProblems = ({ locale, original, value }: { locale: SupportedLocale; original: string; value: string }): string[] => {
  const problems: string[] = []

  try {
    if (JSON.stringify(argumentsOf(parse(original))) !== JSON.stringify(argumentsOf(parse(value)))) {
      problems.push("changed ICU arguments or tags")
    }
  } catch (error) {
    return [String(error)]
  }

  if (value.includes("```") && !original.includes("```")) {
    problems.push("unexpected Markdown code fence")
  }

  if (locale !== I18N.DEFAULT_LOCALE && value === original && (value.match(/\p{L}+/gu)?.length ?? 0) >= MIN_UNTRANSLATED_WORDS) {
    problems.push("untranslated English text")
  }

  if (TRANSLATION_INSTRUCTIONS_PATTERN.test(value)) {
    problems.push("translation instructions in visible copy")
  }

  if (TRANSLATION_MARKER_PATTERN.test(value)) {
    problems.push("unresolved translation marker")
  }

  return problems
}

const problems: string[] = []

for (const file of readdirSync(join(MESSAGES_DIR, I18N.DEFAULT_LOCALE)).filter((name) => name.endsWith(".json"))) {
  const source = new Map(readMessages(I18N.DEFAULT_LOCALE, file))

  for (const locale of I18N.SUPPORTED_LOCALES) {
    for (const [key, value] of readMessages(locale, file)) {
      const found = messageProblems({ locale, original: source.get(key) ?? "", value })
      problems.push(...found.map((problem) => `${locale}/${file}:${key}: ${problem}`))
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(FAILURE_EXIT_CODE)
}

console.log("✅ Every translated message parses and preserves its ICU arguments and rich-text tags.")
