import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export interface FormOfAddress {
  readonly form: string
  readonly never: readonly string[]
  readonly neverInsideSentence: readonly string[]
  readonly neverEndingSentence: readonly string[]
  readonly neverStartingClause: readonly string[]
  readonly clauseOpeners: readonly string[]
}

const NOTHING: readonly string[] = []

export const FORMS_OF_ADDRESS = {
  "de-DE": {
    clauseOpeners: NOTHING,
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
    neverStartingClause: NOTHING,
  },
  "en-US": {
    clauseOpeners: NOTHING,
    form: "you",
    never: NOTHING,
    neverEndingSentence: NOTHING,
    neverInsideSentence: NOTHING,
    neverStartingClause: NOTHING,
  },
  "es-ES": {
    clauseOpeners: ["así que", "por eso", "por lo tanto", "por tanto"],
    form: "tú",
    never: ["usted", "ustedes", "Ud.", "Uds.", "Vd.", "Vds.", "vosotros", "vosotras", "vuestro", "vuestra", "vuestros", "vuestras"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: NOTHING,
    neverStartingClause: [
      "abra",
      "acceda",
      "actualice",
      "añada",
      "asegúrese",
      "borre",
      "cambie",
      "cancele",
      "compruebe",
      "confirme",
      "consulte",
      "copie",
      "defina",
      "descargue",
      "desactive",
      "detenga",
      "edite",
      "ejecute",
      "elija",
      "elimine",
      "escriba",
      "espere",
      "guarde",
      "haga",
      "inicie",
      "instale",
      "introduzca",
      "lea",
      "mire",
      "pegue",
      "ponga",
      "pruebe",
      "pulse",
      "reinicie",
      "revise",
      "seleccione",
      "siga",
      "utilice",
      "vaya",
      "vea",
      "visite",
      "vuelva",
    ],
  },
  "fr-FR": {
    clauseOpeners: NOTHING,
    form: "vous",
    never: ["tu", "te", "toi", "ta", "tes", "t'", "t’"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: NOTHING,
    neverStartingClause: NOTHING,
  },
  "it-IT": {
    clauseOpeners: NOTHING,
    form: "tu",
    never: ["voi", "vostro", "vostra", "vostri", "vostre"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: ["Lei", "Suo", "Sua", "Suoi", "Sue"],
    neverStartingClause: NOTHING,
  },
  "ja-JP": {
    clauseOpeners: NOTHING,
    form: "です・ます",
    never: NOTHING,
    neverEndingSentence: ["だ", "だった", "だろう", "である", "であった", "であろう", "ではない", "ではなかった"],
    neverInsideSentence: NOTHING,
    neverStartingClause: NOTHING,
  },
  "pl-PL": {
    clauseOpeners: NOTHING,
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
    neverStartingClause: NOTHING,
  },
  "pt-BR": {
    clauseOpeners: NOTHING,
    form: "você",
    never: ["tu", "te", "ti", "teu", "tua", "teus", "tuas", "contigo"],
    neverEndingSentence: NOTHING,
    neverInsideSentence: NOTHING,
    neverStartingClause: NOTHING,
  },
  "uk-UA": {
    clauseOpeners: NOTHING,
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
    neverStartingClause: NOTHING,
  },
} as const satisfies Record<SupportedLocale, FormOfAddress>

const IGNORED_TEXT = /https?:\/\/\S+|\]\([^)\s]*\)|「[^」]*」|『[^』]*』/gu
const WORD_BEFORE = String.raw`(?<![\p{L}\p{N}])`
const WORD_AFTER = String.raw`(?![\p{L}\p{N}])`
const INSIDE_SENTENCE = String.raw`(?<=[\p{L}\p{N},;][^\S\n]+)`
const SENTENCE_END = "(?=。)"
const LINE_MARKER = String.raw`(?:#+[^\S\n]+|[-*+][^\S\n]+|\d+\.[^\S\n]+)?[¿¡]?`
const ENDS_WITH_LETTER = /\p{L}$/u

const escape = (word: string): string => word.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)

const capitalized = (word: string): string => word.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase())

const withCapitals = (words: readonly string[]): string[] => words.flatMap((word) => [word, capitalized(word)])

const wholeWord = (word: string): string => `${escape(word)}${ENDS_WITH_LETTER.test(word) ? WORD_AFTER : ""}`

const clauseStart = (openers: readonly string[]): string =>
  String.raw`(?<=(?:^|[.!?:;][^\S\n]+${withCapitals(openers)
    .map((opener) => String.raw`|${WORD_BEFORE}${escape(opener)}[^\S\n]+`)
    .join("")})${LINE_MARKER})`

const patternOf = (alternatives: readonly string[], pattern: (alternation: string) => string): RegExp[] =>
  alternatives.length === 0 ? [] : [new RegExp(pattern([...new Set(alternatives)].join("|")), "gmu")]

const patternsOf = ({ clauseOpeners, never, neverEndingSentence, neverInsideSentence, neverStartingClause }: FormOfAddress): RegExp[] => [
  ...patternOf(
    withCapitals(never).map((word) => wholeWord(word)),
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
  ...patternOf(
    withCapitals(neverStartingClause).map((word) => wholeWord(word)),
    (alternation) => `${clauseStart(clauseOpeners)}(?:${alternation})`,
  ),
]

const compiledPatterns = new Map<SupportedLocale, RegExp[]>()

const patternsFor = (locale: SupportedLocale): RegExp[] => {
  const compiled = compiledPatterns.get(locale)

  if (compiled !== undefined) {
    return compiled
  }

  const patterns = patternsOf(FORMS_OF_ADDRESS[locale])
  compiledPatterns.set(locale, patterns)

  return patterns
}

export const formOfAddressProblems = ({ locale, text }: { locale: SupportedLocale; text: string }): string[] => {
  const readable = text.replaceAll(IGNORED_TEXT, " ")
  const found = new Set(patternsFor(locale).flatMap((pattern) => readable.match(pattern) ?? []))

  return [...found].map((word) => `uses “${word}” where ${locale} addresses the reader as “${FORMS_OF_ADDRESS[locale].form}”`)
}
