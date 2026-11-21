import {
  type MessageFormatElement,
  type SelectElement,
  isLiteralElement,
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

import { AFFILIATE_PORTAL_URL } from "~/src/data/affiliates"
import { CLI_GENERATION_VALUES, CLI_INIT_COMMAND } from "~/src/data/cli"
import { BILLING_GENERATION } from "~/src/data/marketing"
import { FEATURE_STATUS } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { CONTACT_EMAIL } from "~/src/presentation/branding"

const MESSAGES_DIRECTORY = join(import.meta.dirname, "../../../messages")
const GENERATION_ARGUMENT = "generation"
const OTHER_OPTION = "other"
const MESSAGE_KEY = "message"
const ARRIVING_AFFILIATE_PROGRAM_VALUES = {
  email: CONTACT_EMAIL,
  portal: new URL(AFFILIATE_PORTAL_URL).host,
  program: FEATURE_STATUS.ARRIVING,
}

const GENERATION_MESSAGES = [
  "components.custom.pricing.json:tiers.core.tagline",
  "pages.app.json:overview.docs.description",
  "pages.blog.json:post.cta.body",
  "pages.landing.json:cli.generates",
  "pages.landing.json:cli.lead",
  "pages.landing.json:cli.reuse.body",
  "pages.landing.json:faq.items.q1.answer",
  "pages.landing.json:gate.assurance",
  "pages.landing.json:hero.description",
  "pages.landing.json:line.stations.edge.body",
  "pages.landing.json:manifest.lead",
  "pages.legal.affiliates.json:sections.join.body",
]

const OPTION_STATUS_MESSAGES = new Set(["pages.landing.json:cli.coming"])

const ARRIVING_WORDING: Record<SupportedLocale, RegExp> = {
  "de-DE": /späteren Versionen?|Projektgenerierung|Generierung verfügbar/iu,
  "en-US": /later releases?|project generation|generation (?:ships|arrives)/iu,
  "es-ES": /versi(?:ón|ones) posterior(?:es)?|generación de proyectos|llegue la generación/iu,
  "fr-FR": /versions? ultérieures?|génération de projets|génération disponible|générer des projets/iu,
  "it-IT": /versioni? successiv[ae]|generazione dei progetti|arriverà la generazione/iu,
  "ja-JP": /今後のリリース|プロジェクト生成|生成機能の提供後/u,
  "pl-PL": /kolejnych wyda(?:ń|niach)|generowani(?:e|em|a) projektów|generowanie będzie gotowe/iu,
  "pt-BR": /vers(?:ão|ões) futuras?|próximas versões|geração de projetos|geração chegar/iu,
  "uk-UA": /наступних випуск(?:ів|ах)|генераці(?:я|єю|ї) проєктів|генеруванн(?:я|ям) проєктів|генерація стане доступною/iu,
}

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

const isGenerationSelect = (node: MessageFormatElement): node is SelectElement =>
  isSelectElement(node) && node.value === GENERATION_ARGUMENT

const childrenOf = (node: MessageFormatElement): MessageFormatElement[][] => {
  if (isSelectElement(node) || isPluralElement(node)) {
    return Object.values(node.options).map((option) => option.value)
  }

  return isTagElement(node) ? [node.children] : []
}

const generationSelects = (nodes: MessageFormatElement[]): SelectElement[] =>
  nodes.flatMap((node) => [
    ...(isGenerationSelect(node) ? [node] : []),
    ...childrenOf(node).flatMap((children) => generationSelects(children)),
  ])

const nodeText = (node: MessageFormatElement, textOf: (nodes: MessageFormatElement[]) => string): string => {
  if (isLiteralElement(node)) {
    return node.value
  }

  return childrenOf(node)
    .map((children) => textOf(children))
    .join(" ")
}

const textOutsideGeneration = (nodes: MessageFormatElement[]): string =>
  nodes
    .filter((node) => !isGenerationSelect(node))
    .map((node) => nodeText(node, textOutsideGeneration))
    .join(" ")

const literalText = (nodes: MessageFormatElement[]): string => nodes.map((node) => nodeText(node, literalText)).join(" ")

const tagNames = (nodes: MessageFormatElement[]): string[] =>
  nodes.flatMap((node) => [...(isTagElement(node) ? [node.value] : []), ...childrenOf(node).flatMap((children) => tagNames(children))])

const render = ({ generation, locale, message }: { generation: string; locale: SupportedLocale; message: Message }): string =>
  createTranslator({ locale, messages: { [MESSAGE_KEY]: message.value } }).markup(MESSAGE_KEY, {
    ...REPOSITORY_FACTS,
    ...CLI_GENERATION_VALUES,
    ...ARRIVING_AFFILIATE_PROGRAM_VALUES,
    billing: BILLING_GENERATION,
    ...Object.fromEntries(tagNames(message.nodes).map((tag) => [tag, (chunks: string) => chunks])),
    generation,
  })

const MESSAGES = Object.fromEntries(I18N.SUPPORTED_LOCALES.map((locale) => [locale, readMessages(locale)]))

const generationMessages = (locale: SupportedLocale): Message[] =>
  (MESSAGES[locale] ?? []).filter((message) => generationSelects(message.nodes).length > 0)

describe("project generation status in the copy", () => {
  it("lists the same messages under the generation status in every locale", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      expect(
        generationMessages(locale)
          .map(({ id }) => id)
          .toSorted(),
      ).toStrictEqual(GENERATION_MESSAGES)
    }
  })

  it("gives every generation select an available variant and an arriving one", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      for (const message of generationMessages(locale)) {
        for (const select of generationSelects(message.nodes)) {
          expect(Object.keys(select.options).toSorted(), `${locale} ${message.id}`).toStrictEqual([FEATURE_STATUS.AVAILABLE, OTHER_OPTION])
        }
      }
    }
  })

  it("renders both variants in every locale, and names the init command only where English does", () => {
    const english = new Map(
      generationMessages(I18N.DEFAULT_LOCALE).map((message) => [
        message.id,
        render({ generation: FEATURE_STATUS.AVAILABLE, locale: I18N.DEFAULT_LOCALE, message }).includes(CLI_INIT_COMMAND),
      ]),
    )
    for (const locale of I18N.SUPPORTED_LOCALES) {
      for (const message of generationMessages(locale)) {
        const available = render({ generation: FEATURE_STATUS.AVAILABLE, locale, message })
        const arriving = render({ generation: FEATURE_STATUS.ARRIVING, locale, message })

        expect(available, `${locale} ${message.id}`).not.toBe(arriving)
        expect(`${available}${arriving}`, `${locale} ${message.id}`).not.toMatch(/[{}]/u)
        expect(available.includes(CLI_INIT_COMMAND), `${locale} ${message.id}`).toBe(english.get(message.id))
        expect(arriving, `${locale} ${message.id}`).not.toContain(CLI_INIT_COMMAND)
      }
    }
  })

  it("keeps the wording that generation is arriving inside the generation select, out of its available variant", () => {
    const outside = I18N.SUPPORTED_LOCALES.flatMap((locale) =>
      (MESSAGES[locale] ?? [])
        .filter(({ id, nodes }) => !OPTION_STATUS_MESSAGES.has(id) && ARRIVING_WORDING[locale].test(textOutsideGeneration(nodes)))
        .map(({ id }) => `${locale} ${id}`),
    )
    const available = I18N.SUPPORTED_LOCALES.flatMap((locale) =>
      generationMessages(locale)
        .filter(({ nodes }) =>
          generationSelects(nodes).some((select) =>
            ARRIVING_WORDING[locale].test(literalText(select.options[FEATURE_STATUS.AVAILABLE]?.value ?? [])),
          ),
        )
        .map(({ id }) => `${locale} ${id}`),
    )

    expect(outside).toStrictEqual([])
    expect(available).toStrictEqual([])
  })
})
