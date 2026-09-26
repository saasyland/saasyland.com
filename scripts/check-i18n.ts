#!/usr/bin/env bun

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import process from "node:process"
import type { AbstractIntlMessages } from "use-intl"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { loadLocaleMessages } from "./i18n-messages"

const FAILURE_EXIT_CODE = 1
const LAST_SCOPE_INDEX = -1
const SOURCE_LOCALE = I18N.DEFAULT_LOCALE
const SOURCE_ROOT = join(import.meta.dirname, "../src")

const SCOPE_PATTERN = /(?:useTranslations\(\s*|getTranslations\(\s*|namespace:\s+)(?:["'`](?<namespace>.*?)["'`])?/gu
const KEY_PATTERN = /[^\w]t(?:\.rich|\.markup|\.raw)?\s*\(\s*(?<quote>["'`])(?<key>[\w.-]+)\k<quote>/gu

interface TranslationScope {
  end: number
  namespace: string
  start: number
}

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
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      collectSourceFiles(path, found)
    } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      found.push(path)
    }
  }

  return found
}

const hasMessage = (messages: AbstractIntlMessages, key: string): boolean => {
  let node: AbstractIntlMessages | string | undefined = messages

  for (const segment of key.split(".")) {
    if (node === undefined || typeof node === "string") {
      return false
    }
    node = node[segment]
  }

  return node !== undefined
}

const translationScopes = (source: string): TranslationScope[] => {
  const scopes: TranslationScope[] = []
  let isScoped = false

  for (const match of source.matchAll(SCOPE_PATTERN)) {
    const previous = scopes.at(LAST_SCOPE_INDEX)
    const namespace = match.groups?.["namespace"]

    if (isScoped && previous !== undefined) {
      previous.end = match.index
    }

    isScoped = namespace !== undefined && namespace.length > 0

    if (namespace !== undefined && namespace.length > 0) {
      scopes.push({ end: source.length, namespace, start: match.index })
    }
  }

  return scopes
}

const missingKeys = (file: string, messages: AbstractIntlMessages): string[] => {
  const source = readFileSync(file, "utf8")
  const scopes = translationScopes(source)

  return [...source.matchAll(KEY_PATTERN)].flatMap((match) => {
    const key = match.groups?.["key"] ?? ""
    const scope = scopes.find(({ end, start }) => start <= match.index && match.index < end)
    const fullKey = scope === undefined ? key : `${scope.namespace}.${key}`

    if (hasMessage(messages, fullKey)) {
      return []
    }

    const line = source.slice(0, match.index).split("\n").length
    return [`  ${file.replace(SOURCE_ROOT, "src")}:${line}: ${fullKey}`]
  })
}

const checkStaticKeys = (): boolean => {
  const messages = loadLocaleMessages(SOURCE_LOCALE)
  const missing = collectSourceFiles(SOURCE_ROOT)
    .filter((file) => !file.includes("/__test__/") && file.endsWith(".tsx"))
    .flatMap((file) => missingKeys(file, messages))

  if (missing.length === 0) {
    process.stdout.write("✅ Every static translation key resolves in its useTranslations scope.\n")
    return true
  }

  process.stderr.write("\n❌ Translation keys do not resolve in their useTranslations scope.\n\n")
  process.stderr.write(`${missing.join("\n")}\n\n`)
  process.stderr.write("Use one useTranslations per component; a later call re-scopes every t() after it.\n\n")
  return false
}

const run = (): void => {
  if (!checkLocaleParity() || !checkStaticKeys()) {
    process.exit(FAILURE_EXIT_CODE)
  }
}

run()
