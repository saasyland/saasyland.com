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

import { CONFIRMATION_WINDOW_IN_HOURS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { TIER_SUPPORT_VALUES } from "~/src/data/license"
import { COURSE_PLATFORM_VALUES } from "~/src/data/marketing"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

import { APP_DOMAIN } from "~/src/presentation/branding"

const MESSAGES_DIRECTORY = join(import.meta.dirname, "../../../messages")
const OTHER_OPTION = "other"
const MESSAGE_KEY = "message"

const FEATURES = [
  {
    argument: "sending",
    messages: [
      "components.custom.footer.json:buildLog.body",
      "emails.newsletter-confirmation-email.json:body",
      "pages.courses.json:catalogue.empty.body",
      "pages.newsletter.confirm.json:confirmed.body",
      "pages.newsletter.confirm.json:prompt.body",
    ],
  },
  { argument: "teamSeatsAccess", messages: ["pages.landing.json:faq.items.q7.answer"] },
] as const

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

const selectsOn = (argument: string, nodes: MessageFormatElement[]): SelectElement[] =>
  nodes.flatMap((node) => [
    ...(isSelectElement(node) && node.value === argument ? [node] : []),
    ...childrenOf(node).flatMap((children) => selectsOn(argument, children)),
  ])

const MESSAGE_VALUES = {
  ...REPOSITORY_FACTS,
  ...CLI_GENERATION_VALUES,
  ...COURSE_PLATFORM_VALUES,
  ...TIER_SUPPORT_VALUES,
  appDomain: APP_DOMAIN,
  hours: CONFIRMATION_WINDOW_IN_HOURS,
}

const render = ({
  argument,
  locale,
  status,
  value,
}: {
  argument: string
  locale: SupportedLocale
  status: FeatureStatus
  value: string
}): string =>
  createTranslator({ locale, messages: { [MESSAGE_KEY]: value } })(MESSAGE_KEY, {
    ...MESSAGE_VALUES,
    ...Object.fromEntries([[argument, status]]),
  })

describe.each(FEATURES)("the copy that depends on $argument", ({ argument, messages }) => {
  it("is the same list of messages in every locale, each with an available variant and an arriving one", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      const selected = readMessages(locale).filter(({ nodes }) => selectsOn(argument, nodes).length > 0)

      expect(selected.map(({ id }) => id).toSorted(), locale).toStrictEqual([...messages])
      for (const { id, nodes } of selected) {
        for (const select of selectsOn(argument, nodes)) {
          expect(Object.keys(select.options).toSorted(), `${locale} ${id}`).toStrictEqual([FEATURE_STATUS.AVAILABLE, OTHER_OPTION])
        }
      }
    }
  })

  it("renders both variants in every locale without a placeholder left over", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      for (const { id, value } of readMessages(locale).filter(({ nodes }) => selectsOn(argument, nodes).length > 0)) {
        const available = render({ argument, locale, status: FEATURE_STATUS.AVAILABLE, value })
        const arriving = render({ argument, locale, status: FEATURE_STATUS.ARRIVING, value })

        expect(available, `${locale} ${id}`).not.toBe(arriving)
        expect(`${available}${arriving}`, `${locale} ${id}`).not.toMatch(/[{}]/u)
      }
    }
  })
})
