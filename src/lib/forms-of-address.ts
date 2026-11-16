import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export interface FormOfAddress {
  readonly form: string
  readonly never: readonly string[]
  readonly neverInsideSentence: readonly string[]
  readonly neverEndingSentence: readonly string[]
}

const NOTHING: readonly string[] = []

export const FORMS_OF_ADDRESS = {
  "de-DE": {
    form: "du",
    never: NOTHING,
    neverEndingSentence: NOTHING,
    neverInsideSentence: [
      "Sie",
      "Ihr",
      "Ihre",
      "Ihrem",
      "Ihren",
      "Ihrer",
      "Ihres",
      "Ihnen",
      "Du",
      "Dich",
      "Dir",
      "Dein",
      "Deine",
      "Deinem",
      "Deinen",
      "Deiner",
      "Deines",
    ],
  },
  "en-US": { form: "you", never: NOTHING, neverEndingSentence: NOTHING, neverInsideSentence: NOTHING },
  "es-ES": {
    form: "tú",
    never: ["usted", "ustedes", "Ud.", "Uds.", "Vd.", "Vds.", "vosotros", "vosotras", "vuestro", "vuestra", "vuestros", "vuestras"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: NOTHING,
  },
  "fr-FR": {
    form: "vous",
    never: ["tu", "te", "toi", "ta", "tes", "t'", "t’"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: NOTHING,
  },
  "it-IT": {
    form: "tu",
    never: ["voi", "vostro", "vostra", "vostri", "vostre"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: ["Lei", "Suo", "Sua", "Suoi", "Sue"],
  },
  "ja-JP": {
    form: "です・ます",
    never: NOTHING,
    neverEndingSentence: ["だ", "だった", "だろう", "である", "であった", "であろう", "ではない", "ではなかった"],
    neverInsideSentence: NOTHING,
  },
  "pl-PL": {
    form: "Ty",
    never: NOTHING,
    neverEndingSentence: NOTHING,
    neverInsideSentence: [
      "Pan",
      "Pana",
      "Panu",
      "Panem",
      "Pani",
      "Panią",
      "Państwo",
      "Państwa",
      "Państwu",
      "Państwem",
      "ty",
      "twój",
      "twoja",
      "twoje",
      "twojego",
      "twojej",
      "twojemu",
      "twoim",
      "twoją",
      "twoi",
      "twoich",
      "twoimi",
      "cię",
      "ciebie",
      "tobie",
      "tobą",
    ],
  },
  "pt-BR": {
    form: "você",
    never: ["tu", "te", "ti", "teu", "tua", "teus", "tuas", "contigo"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: NOTHING,
  },
  "uk-UA": {
    form: "ви",
    never: [
      "ти",
      "тебе",
      "тобі",
      "тобою",
      "твій",
      "твоя",
      "твоє",
      "твої",
      "твого",
      "твоєї",
      "твоєму",
      "твоїй",
      "твоїм",
      "твоїх",
      "твоїми",
      "твою",
    ],
    neverEndingSentence: NOTHING,
    neverInsideSentence: [
      "Ви",
      "Вас",
      "Вам",
      "Вами",
      "Ваш",
      "Ваша",
      "Ваше",
      "Ваші",
      "Вашого",
      "Вашої",
      "Вашому",
      "Вашій",
      "Вашим",
      "Ваших",
      "Вашими",
      "Вашу",
    ],
  },
} as const satisfies Record<SupportedLocale, FormOfAddress>

const IGNORED_TEXT = /https?:\/\/\S+|\]\([^)\s]*\)|「[^」]*」|『[^』]*』/gu
const WORD_BEFORE = String.raw`(?<![\p{L}\p{N}])`
const WORD_AFTER = String.raw`(?![\p{L}\p{N}])`
const INSIDE_SENTENCE = String.raw`(?<=[\p{L}\p{N},;][^\S\n]+)`
const SENTENCE_END = "(?=。)"
const ENDS_WITH_LETTER = /\p{L}$/u

const escape = (word: string): string => word.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)

const capitalized = (word: string): string => word.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase())

const wholeWord = (word: string): string => `${escape(word)}${ENDS_WITH_LETTER.test(word) ? WORD_AFTER : ""}`

const patternOf = (alternatives: readonly string[], pattern: (alternation: string) => string): RegExp[] =>
  alternatives.length === 0 ? [] : [new RegExp(pattern([...new Set(alternatives)].join("|")), "gu")]

const patternsOf = ({ never, neverEndingSentence, neverInsideSentence }: FormOfAddress): RegExp[] => [
  ...patternOf(
    never.flatMap((word) => [wholeWord(word), wholeWord(capitalized(word))]),
    (alternation) => `${WORD_BEFORE}(?:${alternation})`,
  ),
  ...patternOf(
    neverInsideSentence.map((word) => wholeWord(word)),
    (alternation) => `${INSIDE_SENTENCE}(?:${alternation})`,
  ),
  ...patternOf(
    neverEndingSentence.map((word) => escape(word)),
    (alternation) => `(?:${alternation})${SENTENCE_END}`,
  ),
]

export const formOfAddressProblems = ({ locale, text }: { locale: SupportedLocale; text: string }): string[] => {
  const formOfAddress: FormOfAddress = FORMS_OF_ADDRESS[locale]
  const readable = text.replaceAll(IGNORED_TEXT, " ")
  const found = new Set(patternsOf(formOfAddress).flatMap((pattern) => readable.match(pattern) ?? []))

  return [...found].map((word) => `uses “${word}” where ${locale} addresses the reader as “${formOfAddress.form}”`)
}
