export interface SeedObject {
  readonly file: string
  readonly key: string
  readonly type: string
}

export interface TestSeed {
  readonly objects: readonly SeedObject[]
  readonly statements: readonly string[]
}

export const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`

export const json = (value: object): string => literal(JSON.stringify(value))
