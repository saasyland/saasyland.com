#!/usr/bin/env bun

import * as STACK from "@saasyland/stack"
import * as STACK_API from "@saasyland/stack/api"
import * as STACK_CLI from "@saasyland/stack/cli"
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
const KEY_SEPARATOR = "."

const CATALOGUE_NAMESPACES = ["countries", "currencies", "locales", "timezones"] as const

const SCOPE_PATTERN = /(?:useTranslations\(\s*|getTranslations\(\s*|namespace:\s+)(?:["'`](?<namespace>.*?)["'`])?/gu
const KEY_PATTERN = /[^\w]t(?:\.rich|\.markup|\.raw)?\s*\(\s*(?<quote>["'`])(?<key>[\w.-]+)\k<quote>/gu
const CALL_PATTERN = /(?<![\w.])t(?:\.rich|\.markup|\.raw|\.has)?\(/gu
const ARGUMENT_PATTERN = /^(?:"[^"]*"|'[^']*'|`[^`]*`|[^,()[\]{}"'`]|\((?:[^()]|\([^()]*\))*\)|\[[^\]]*\]|\{[^{}]*\})*/u
const QUOTED_PATTERN = /(?<quote>["'])(?<key>(?:(?!\k<quote>).)*)\k<quote>/gu
const TEMPLATE_PATTERN = /`(?<template>[^`]*)`/gu
const PLACEHOLDER_PATTERN = /\$\{[^}]*\}/u
const NAME_PATTERN = /["'`](?<name>[\w.-]+)["'`]/gu
const PAGE_METADATA_PATTERN = /^[\w.-]+\.metadata\.(?:description|title)$/u

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

const isApplicationSource = (file: string): boolean => !file.includes("/__test__/") && !file.endsWith(".d.ts")

const checkStaticKeys = (): boolean => {
  const messages = loadLocaleMessages(SOURCE_LOCALE)
  const missing = collectSourceFiles(SOURCE_ROOT)
    .filter((file) => isApplicationSource(file) && file.endsWith(".tsx"))
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

interface KeyTemplate {
  readonly parts: readonly string[]
}

export interface KeyUsage {
  readonly dynamicScopes: Set<string>
  readonly keys: Set<string>
  readonly names: Set<string>
  readonly templates: KeyTemplate[]
}

export const emptyKeyUsage = (): KeyUsage => ({ dynamicScopes: new Set(), keys: new Set(), names: new Set(), templates: [] })

const quotedKeys = (argument: string): string[] => [...argument.matchAll(QUOTED_PATTERN)].map((match) => match.groups?.["key"] ?? "")

const templateParts = (argument: string): string[][] =>
  [...argument.matchAll(TEMPLATE_PATTERN)].map((match) => (match.groups?.["template"] ?? "").split(PLACEHOLDER_PATTERN))

export const recordSourceUsage = (source: string, usage: KeyUsage): void => {
  const scopes = translationScopes(source)

  for (const match of source.matchAll(NAME_PATTERN)) {
    usage.names.add(match.groups?.["name"] ?? "")
  }

  for (const call of source.matchAll(CALL_PATTERN)) {
    const argument = ARGUMENT_PATTERN.exec(source.slice(call.index + call[0].length))?.[0] ?? ""
    const scope = scopes.find(({ end, start }) => start <= call.index && call.index < end)
    const prefix = scope === undefined ? "" : `${scope.namespace}${KEY_SEPARATOR}`
    const keys = quotedKeys(argument)
    const templates = templateParts(argument)

    if (keys.length === 0 && templates.length === 0) {
      usage.dynamicScopes.add(prefix)
    }

    for (const key of keys) {
      usage.keys.add(`${prefix}${key}`)
    }

    for (const [first = "", ...rest] of templates) {
      usage.templates.push({ parts: [`${prefix}${first}`, ...rest] })
    }
  }
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

export const recordContractNames = (modules: readonly unknown[], usage: KeyUsage): void => {
  for (const name of modules.flatMap((module) => stringValues(module))) {
    usage.names.add(name)
  }
}

const isKeyOrChild = (key: string, path: string): boolean => key === path || key.startsWith(`${path}${KEY_SEPARATOR}`)

const matchesParts = (key: string, parts: readonly string[], names: Set<string>): boolean => {
  const [first = "", ...rest] = parts

  if (!key.startsWith(first)) {
    return false
  }

  const remaining = key.slice(first.length)

  if (rest.length === 0) {
    return remaining.length === 0 || remaining.startsWith(KEY_SEPARATOR)
  }

  return Array.from({ length: remaining.length }, (_, index) => index + 1).some(
    (end) => names.has(remaining.slice(0, end)) && matchesParts(remaining.slice(end), rest, names),
  )
}

const isNamePath = (path: string, names: Set<string>): boolean => {
  const segments = path.split(KEY_SEPARATOR)

  return (
    names.has(path) ||
    segments.some(
      (_, index) =>
        index > 0 && names.has(segments.slice(0, index).join(KEY_SEPARATOR)) && names.has(segments.slice(index).join(KEY_SEPARATOR)),
    )
  )
}

export const isUsedKey = (key: string, usage: KeyUsage): boolean =>
  CATALOGUE_NAMESPACES.some((namespace) => key.startsWith(`${namespace}${KEY_SEPARATOR}`)) ||
  PAGE_METADATA_PATTERN.test(key) ||
  [...usage.keys].some((path) => isKeyOrChild(key, path)) ||
  usage.templates.some(({ parts }) => matchesParts(key, parts, usage.names)) ||
  [...usage.dynamicScopes].some((scope) => key.startsWith(scope) && isNamePath(key.slice(scope.length), usage.names))

const checkUnusedKeys = (): boolean => {
  const usage = emptyKeyUsage()

  for (const file of collectSourceFiles(SOURCE_ROOT).filter((path) => isApplicationSource(path))) {
    recordSourceUsage(readFileSync(file, "utf8"), usage)
  }

  recordContractNames([STACK, STACK_API, STACK_CLI], usage)

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

if (import.meta.main && (!checkLocaleParity() || !checkStaticKeys() || !checkUnusedKeys())) {
  process.exit(FAILURE_EXIT_CODE)
}
