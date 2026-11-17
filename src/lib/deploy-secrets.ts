export const SECRET_PLACEHOLDER_BRACKETS = [
  ["[", "]"],
  ["<", ">"],
  ["{{", "}}"],
] as const

export const SECRET_PLACEHOLDER_WORDS = ["changeme", "placeholder", "replaceme", "tbd", "todo", "update"] as const

const PLACEHOLDER_WORDS: ReadonlySet<string> = new Set(SECRET_PLACEHOLDER_WORDS)

const WORD_SEPARATORS = /[\s_-]/gu

const isPlaceholder = (value: string): boolean =>
  SECRET_PLACEHOLDER_BRACKETS.some(([open, close]) => value.startsWith(open) && value.endsWith(close)) ||
  PLACEHOLDER_WORDS.has(value.replaceAll(WORD_SEPARATORS, "").toLowerCase())

export const readDeploySecrets = ({
  file,
  names,
  values,
}: {
  readonly file: string
  readonly names: readonly string[]
  readonly values: Readonly<Record<string, string | undefined>>
}): Record<string, string> => {
  const entries = names.map((name): [string, string] => [name, values[name] ?? ""])
  const namesWhere = (matches: (value: string) => boolean): string[] =>
    entries.filter(([, value]) => matches(value.trim())).map(([name]) => name)
  const missing = namesWhere((value) => value === "")
  const placeholders = namesWhere(isPlaceholder)

  const problems = [
    { found: missing, problem: `Set ${missing.join(", ")} in ${file}.` },
    { found: placeholders, problem: `Replace the placeholders in ${file} with the real values of ${placeholders.join(", ")}.` },
  ]
    .filter(({ found }) => found.length > 0)
    .map(({ problem }) => problem)

  if (problems.length > 0) {
    throw new Error(problems.join("\n"))
  }

  return Object.fromEntries(entries)
}
