#!/usr/bin/env bun

import * as STACK from "@saasyland/stack"
import * as STACK_API from "@saasyland/stack/api"
import * as STACK_CLI from "@saasyland/stack/cli"
import { readFileSync, readdirSync } from "node:fs"
import { join, posix } from "node:path"
import process from "node:process"
import type { AbstractIntlMessages } from "use-intl"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { loadLocaleMessages } from "./i18n-messages"
import { FAILURE_EXIT_CODE } from "./run-command.ts"
import {
  KEY_SEPARATOR,
  type KeyRead,
  TRANSLATOR_METHOD,
  type TranslationUsage,
  WHOLE_KEY,
  analyzeTranslations,
} from "./translation-usage.ts"

const SOURCE_LOCALE = I18N.DEFAULT_LOCALE
const ROOT = join(import.meta.dirname, "..")
const SOURCE_DIRECTORY = "src"
const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const
const TEST_DIRECTORY = "/__test__/"
const DECLARATION_EXTENSION = ".d.ts"

const CATALOGUE_NAMESPACES = ["countries", "currencies", "flow-features", "locales", "timezones"] as const

const PAGE_METADATA_PATTERN = /^[\w.-]+\.metadata\.(?:description|title)$/u
const NO_NAMES: ReadonlySet<string> = new Set()

const compareAlphabetically = (left: string, right: string): number => left.localeCompare(right)

const flattenMessageKeys = (value: unknown, prefix = ""): string[] => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix.length > 0 ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix.length > 0 ? `${prefix}.${key}` : key

    if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
      return flattenMessageKeys(nested, path)
    }

    return [path]
  })
}

const loadLocaleKeys = (locale: string): Set<string> => new Set(flattenMessageKeys(loadLocaleMessages(locale)))

const localeParityProblems = (locale: string, sourceKeys: Set<string>): string[] => {
  const localeKeys = loadLocaleKeys(locale)
  const missing = [...sourceKeys].filter((key) => !localeKeys.has(key)).toSorted(compareAlphabetically)
  const extra = [...localeKeys].filter((key) => !sourceKeys.has(key)).toSorted(compareAlphabetically)

  if (missing.length === 0 && extra.length === 0) {
    return []
  }

  return [
    `Locale "${locale}" is out of sync with "${SOURCE_LOCALE}":`,
    ...missing.map((key) => `  missing: ${key}`),
    ...extra.map((key) => `  extra: ${key}`),
  ]
}

const checkLocaleParity = (): boolean => {
  const sourceKeys = loadLocaleKeys(SOURCE_LOCALE)
  const problems = I18N.SUPPORTED_LOCALES.filter((locale) => locale !== SOURCE_LOCALE).flatMap((locale) =>
    localeParityProblems(locale, sourceKeys),
  )

  if (problems.length === 0) {
    process.stdout.write(`✅ Translation keys are in sync across ${I18N.SUPPORTED_LOCALES.join(", ")}.\n`)
    return true
  }

  process.stderr.write("\n❌ Translation locale parity check failed.\n\n")
  process.stderr.write(`${problems.join("\n")}\n\n`)
  process.stderr.write(`Update messages/{locale}/*.json so every locale matches ${SOURCE_LOCALE} keys exactly.\n\n`)
  return false
}

const collectSourceFiles = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      collectSourceFiles(path, found)
    } else if (SOURCE_EXTENSIONS.some((extension) => path.endsWith(extension))) {
      found.push(path)
    }
  }

  return found
}

const isApplicationSource = (file: string): boolean => !file.includes(TEST_DIRECTORY) && !file.endsWith(DECLARATION_EXTENSION)

const readSource = (file: string): string => readFileSync(join(ROOT, file), "utf8")

const hasMessage = (messages: AbstractIntlMessages, key: string): boolean => {
  let node: AbstractIntlMessages | string | undefined = messages

  for (const segment of key.split(KEY_SEPARATOR)) {
    if (node === undefined || typeof node === "string") {
      return false
    }
    node = node[segment]
  }

  return node !== undefined
}

export const missingKeys = (usage: TranslationUsage, messages: AbstractIntlMessages): string[] => [
  ...new Set(
    usage.reads
      .filter(({ method, parts }) => parts.length === 1 && method !== TRANSLATOR_METHOD.HAS && !hasMessage(messages, parts.join("")))
      .map(({ file, line, parts }) => `  ${file}:${String(line)}: ${parts.join("")}`),
  ),
]

const checkStaticKeys = (usage: TranslationUsage): boolean => {
  const missing = missingKeys(usage, loadLocaleMessages(SOURCE_LOCALE))

  if (missing.length === 0) {
    process.stdout.write("✅ Every static translation key resolves in the namespace of its translator.\n")
    return true
  }

  process.stderr.write("\n❌ Translation keys do not resolve in the namespace of their translator.\n\n")
  process.stderr.write(`${missing.join("\n")}\n\n`)
  process.stderr.write(`Add the key to messages/${SOURCE_LOCALE}/*.json, or read it with a translator of the namespace that holds it.\n\n`)
  return false
}

const stringValues = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value]
  }

  if (value === null || typeof value !== "object") {
    return []
  }

  return Object.values(value).flatMap((nested) => stringValues(nested))
}

export const recordContractNames = (modules: readonly unknown[], usage: TranslationUsage): void => {
  for (const name of modules.flatMap((module) => stringValues(module))) {
    usage.declared.add(name)
  }
}

const nameEnds = (text: string): number[] => Array.from({ length: text.length }, (_, index) => index + 1)

interface Placeholders {
  readonly isName: (name: string) => boolean
  readonly subtree: boolean
}

const matchesParts = (key: string, parts: readonly string[], placeholders: Placeholders): boolean => {
  const [first = "", ...rest] = parts

  if (!key.startsWith(first)) {
    return false
  }

  const remaining = key.slice(first.length)

  if (rest.length === 0) {
    return remaining.length === 0 || (placeholders.subtree && remaining.startsWith(KEY_SEPARATOR))
  }

  return nameEnds(remaining).some(
    (end) => placeholders.isName(remaining.slice(0, end)) && matchesParts(remaining.slice(end), rest, placeholders),
  )
}

const isWholeKey = (parts: readonly string[]): boolean => parts.length === WHOLE_KEY.length && parts.every((part) => part.length === 0)

const readsKey = (usage: TranslationUsage, { file, method, parts }: KeyRead, key: string): boolean => {
  const own = usage.own.get(file) ?? NO_NAMES
  const given = usage.given.get(file) ?? NO_NAMES
  const isLocal = (name: string): boolean => own.has(name) || given.has(name)
  const isName = (name: string): boolean => usage.declared.has(name) || isLocal(name)
  const placeholders = { isName, subtree: method === TRANSLATOR_METHOD.RAW }
  const [first, ...rest] = parts

  if (first !== "" || isWholeKey(parts)) {
    return matchesParts(key, parts, placeholders)
  }

  return nameEnds(key).some((end) => isLocal(key.slice(0, end)) && matchesParts(key.slice(end), rest, placeholders))
}

export const isUsedKey = (key: string, usage: TranslationUsage): boolean =>
  CATALOGUE_NAMESPACES.some((namespace) => key.startsWith(`${namespace}${KEY_SEPARATOR}`)) ||
  PAGE_METADATA_PATTERN.test(key) ||
  usage.reads.some((read) => readsKey(usage, read, key))

const checkUnusedKeys = (usage: TranslationUsage): boolean => {
  const unused = [...loadLocaleKeys(SOURCE_LOCALE)].filter((key) => !isUsedKey(key, usage)).toSorted(compareAlphabetically)

  if (unused.length === 0) {
    process.stdout.write("✅ Every translation key is rendered by the application.\n")
    return true
  }

  process.stderr.write("\n❌ Translation keys that no source file renders.\n\n")
  process.stderr.write(`${unused.map((key) => `  ${key}`).join("\n")}\n\n`)
  process.stderr.write("Delete them from messages/{locale}/*.json in every locale, or render them.\n\n")
  return false
}

const checkTranslationKeys = (): boolean => {
  const usage = analyzeTranslations(
    collectSourceFiles(SOURCE_DIRECTORY).filter((file) => isApplicationSource(file)),
    readSource,
  )

  recordContractNames([STACK, STACK_API, STACK_CLI], usage)

  return checkStaticKeys(usage) && checkUnusedKeys(usage)
}

if (import.meta.main && (!checkLocaleParity() || !checkTranslationKeys())) {
  process.exit(FAILURE_EXIT_CODE)
}
