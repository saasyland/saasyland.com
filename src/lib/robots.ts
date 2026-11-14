import zod from "zod/v4"

const ANY_AGENT = "*"
const END_ANCHOR = "$"
const WILDCARD = "*"
const LAST_GROUP_INDEX = -1

const LINE_BREAK = /\r?\n/u
const COMMENT = /#.*$/u
const DIRECTIVE = /^\s*(?<field>allow|disallow|user-agent)\s*:\s*(?<value>\S*)/iu
const REGEXP_SYNTAX = /[$()*+.?[\\\]^{|}]/gu

const FIELD = {
  ALLOW: "allow",
  USER_AGENT: "user-agent",
} as const

export interface RobotsRule {
  readonly allow: boolean
  readonly path: string
}

const directiveSchema = zod.object({ field: zod.string().toLowerCase(), value: zod.string() })

type Directive = zod.infer<typeof directiveSchema>

interface Group {
  readonly agents: string[]
  readonly rules: RobotsRule[]
}

const readDirective = (line: string): Directive[] => {
  const match = DIRECTIVE.exec(line.replace(COMMENT, ""))

  return match === null ? [] : [directiveSchema.parse(match.groups)]
}

const addDirective = (groups: Group[], { field, value }: Directive): Group[] => {
  const current = groups.at(LAST_GROUP_INDEX)

  if (field !== FIELD.USER_AGENT) {
    current?.rules.push({ allow: field === FIELD.ALLOW, path: value })
    return groups
  }

  if (current?.rules.length === 0) {
    current.agents.push(value)
    return groups
  }

  return [...groups, { agents: [value], rules: [] }]
}

export const parseRobotsRules = (robotsTxt: string): RobotsRule[] =>
  robotsTxt
    .split(LINE_BREAK)
    .flatMap((line) => readDirective(line))
    .reduce<Group[]>((groups, directive) => addDirective(groups, directive), [])
    .filter(({ agents }) => agents.includes(ANY_AGENT))
    .flatMap(({ rules }) => rules)
    .filter(({ path }) => path.length > 0)

const toPattern = (path: string): RegExp => {
  const anchored = path.endsWith(END_ANCHOR)
  const body = anchored ? path.slice(0, -END_ANCHOR.length) : path
  const source = body
    .split(WILDCARD)
    .map((part) => part.replaceAll(REGEXP_SYNTAX, String.raw`\$&`))
    .join(".*")

  return new RegExp(`^${source}${anchored ? END_ANCHOR : ""}`, "u")
}

const outranks = (rule: RobotsRule, other: RobotsRule): boolean =>
  rule.path.length > other.path.length || (rule.path.length === other.path.length && rule.allow)

export const isAllowedByRobots = (rules: readonly RobotsRule[], pathname: string): boolean =>
  rules
    .filter(({ path }) => toPattern(path).test(pathname))
    .reduce<RobotsRule | undefined>((winner, rule) => (winner === undefined || outranks(rule, winner) ? rule : winner), undefined)?.allow ??
  true
