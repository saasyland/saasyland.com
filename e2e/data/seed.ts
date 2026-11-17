type R2Binding = {
  [Binding in keyof Cloudflare.Env]-?: Cloudflare.Env[Binding] extends R2Bucket ? Binding : never
}[keyof Cloudflare.Env]

export interface SeedObject {
  readonly binding: R2Binding
  readonly file: string
  readonly key: string
  readonly metadata: Readonly<Record<string, string>>
  readonly type: string
}

export interface TestSeed {
  readonly objects: readonly SeedObject[]
  readonly statements: readonly string[]
}

export const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`

export const json = (value: object): string => literal(JSON.stringify(value))
