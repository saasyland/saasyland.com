import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export interface NoBreakSpaceMarks {
  readonly after: readonly string[]
  readonly before: readonly string[]
}

const NO_MARKS: NoBreakSpaceMarks = { after: [], before: [] }

export const NO_BREAK_SPACES = {
  "de-DE": NO_MARKS,
  "en-US": NO_MARKS,
  "es-ES": NO_MARKS,
  "fr-FR": { after: ["«"], before: [";", ":", "!", "?", "»"] },
  "it-IT": NO_MARKS,
  "ja-JP": NO_MARKS,
  "pl-PL": NO_MARKS,
  "pt-BR": NO_MARKS,
  "uk-UA": NO_MARKS,
} as const satisfies Record<SupportedLocale, NoBreakSpaceMarks>

const OTHER_SPACES = [
  { name: "U+0020", space: " " },
  { name: "U+202F", space: "\u202F" },
] as const

const problem = ({ locale, mark, name, side }: { locale: SupportedLocale; mark: string; name: string; side: string }): string =>
  `puts ${name} ${side} “${mark}” where ${locale} needs a no-break space, U+00A0`

export const noBreakSpaceProblems = ({ locale, text }: { locale: SupportedLocale; text: string }): string[] => {
  const { after, before }: NoBreakSpaceMarks = NO_BREAK_SPACES[locale]
  const placements = [
    ...before.map((mark) => ({ mark, sequence: (space: string): string => `${space}${mark}`, side: "before" })),
    ...after.map((mark) => ({ mark, sequence: (space: string): string => `${mark}${space}`, side: "after" })),
  ]

  return OTHER_SPACES.flatMap(({ name, space }) =>
    placements.filter(({ sequence }) => text.includes(sequence(space))).map(({ mark, side }) => problem({ locale, mark, name, side })),
  )
}
