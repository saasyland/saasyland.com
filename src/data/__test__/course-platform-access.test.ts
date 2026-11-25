import {
  type MessageFormatElement,
  type SelectElement,
  isPluralElement,
  isSelectElement,
  isTagElement,
  parse,
} from "@formatjs/icu-messageformat-parser"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { TIER_SUPPORT_VALUES } from "~/src/data/license"
import { COURSE_PLATFORM_VALUES } from "~/src/data/marketing"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

const MESSAGES_DIRECTORY = join(import.meta.dirname, "../../../messages")
const ACCESS_ARGUMENTS = ["angularprojectsAccess", "reactprojectsAccess"]
const OTHER_OPTION = "other"
const MESSAGE_KEY = "message"

const ACCESS_MESSAGES = ["pages.landing.json:faq.items.q6.answer"]

interface Message {
  readonly id: string
  readonly nodes: MessageFormatElement[]
  readonly value: string
}

const flatten = (node: unknown, prefix = ""): [string, string][] => {
  if (typeof node === "string") {
    return [[prefix, node]]
  }

  return Object.entries(node ?? {}).flatMap(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key))
}

const readJson = (locale: SupportedLocale, file: string): unknown =>
  JSON.parse(readFileSync(join(MESSAGES_DIRECTORY, locale, file), "utf8"))

const readMessages = (locale: SupportedLocale): Message[] =>
  readdirSync(join(MESSAGES_DIRECTORY, locale))
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => flatten(readJson(locale, file)).map(([key, value]) => ({ id: `${file}:${key}`, nodes: parse(value), value })))

const childrenOf = (node: MessageFormatElement): MessageFormatElement[][] => {
  if (isSelectElement(node) || isPluralElement(node)) {
    return Object.values(node.options).map((option) => option.value)
  }

  return isTagElement(node) ? [node.children] : []
}

const accessSelects = (nodes: MessageFormatElement[]): SelectElement[] =>
  nodes.flatMap((node) => [
    ...(isSelectElement(node) && ACCESS_ARGUMENTS.includes(node.value) ? [node] : []),
    ...childrenOf(node).flatMap((children) => accessSelects(children)),
  ])

const accessMessages = (locale: SupportedLocale): Message[] => readMessages(locale).filter(({ nodes }) => accessSelects(nodes).length > 0)

const render = ({ access, locale, message }: { access: FeatureStatus; locale: SupportedLocale; message: Message }): string =>
  createTranslator({ locale, messages: { [MESSAGE_KEY]: message.value } })(MESSAGE_KEY, {
    ...REPOSITORY_FACTS,
    ...CLI_GENERATION_VALUES,
    ...COURSE_PLATFORM_VALUES,
    ...TIER_SUPPORT_VALUES,
    angularprojectsAccess: access,
    reactprojectsAccess: access,
  })

describe("course platform access in the copy", () => {
  it("lists the same messages under the platforms' access status in every locale", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      expect(
        accessMessages(locale)
          .map(({ id }) => id)
          .toSorted(),
        locale,
      ).toStrictEqual(ACCESS_MESSAGES)
    }
  })

  it("gives every access select an available variant and an arriving one, for both platforms", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      for (const message of accessMessages(locale)) {
        const selects = accessSelects(message.nodes)

        expect(selects.map(({ value }) => value).toSorted(), `${locale} ${message.id}`).toStrictEqual(ACCESS_ARGUMENTS)
        for (const select of selects) {
          expect(Object.keys(select.options).toSorted(), `${locale} ${message.id}`).toStrictEqual([FEATURE_STATUS.AVAILABLE, OTHER_OPTION])
        }
      }
    }
  })

  it("renders both variants in every locale and names both platforms by their hosts", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      for (const message of accessMessages(locale)) {
        const available = render({ access: FEATURE_STATUS.AVAILABLE, locale, message })
        const arriving = render({ access: FEATURE_STATUS.ARRIVING, locale, message })

        expect(available, `${locale} ${message.id}`).not.toBe(arriving)
        expect(`${available}${arriving}`, `${locale} ${message.id}`).not.toMatch(/[{}]/u)
        expect(arriving, `${locale} ${message.id}`).toContain(COURSE_PLATFORM_VALUES.reactprojects)
        expect(arriving, `${locale} ${message.id}`).toContain(COURSE_PLATFORM_VALUES.angularprojects)
      }
    }
  })
})
