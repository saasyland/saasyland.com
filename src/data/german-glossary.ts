type GlossaryRow = readonly [english: string, german: readonly string[], never: readonly string[]]

export const GERMAN_TERMS = [] as const satisfies readonly GlossaryRow[]

export const GERMAN_NAMES = [] as const satisfies readonly GlossaryRow[]

export const GERMAN_PHRASES = [] as const satisfies readonly GlossaryRow[]
