import { API_BASE_PATH } from "@saasyland/stack/api"
import { execFileSync } from "node:child_process"
import { existsSync, globSync, readFileSync } from "node:fs"
import { basename, posix } from "node:path"
import { seededAccounts } from "virtual:repository-facts"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { TIME_RANGES } from "~/src/modules/_core/utils/time-series"
import { COURSE_COVER_PATH_PREFIX, COURSE_COVER_SIZE, COURSE_COVER_WIDTHS } from "~/src/modules/course/course.cover"
import { LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { LOCAL_SERVER, TEST_SERVER_PORTS } from "~/src/data/local-server"
import { FOOTER_NAVIGATION } from "~/src/data/navigation"
import { FOOTER_COLUMN } from "~/src/data/navigation.constants"

import { LIVE_SITE_CHECKS, LIVE_SITE_CHECK_RETRY_DELAYS_MS } from "~/src/lib/deployment"
import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

import { LOCAL_ADMIN } from "~/scripts/local-admin"
import * as ROUTES from "~/src/routes"

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"))

const README = readFileSync("README.md", "utf8")
const MANIFEST = zod
  .object({
    dependencies: zod.record(zod.string(), zod.string()),
    devDependencies: zod.record(zod.string(), zod.string()),
    scripts: zod.record(zod.string(), zod.string()),
  })
  .parse(readJson("package.json"))
const SCRIPTS = Object.keys(MANIFEST.scripts)
const DEPENDENCIES = new Set([...Object.keys(MANIFEST.dependencies), ...Object.keys(MANIFEST.devDependencies)])
const LINT_CONFIG = readFileSync("vite.config.ts", "utf8")
const WORKFLOWS = globSync(".github/workflows/*.yml").map((path) => readFileSync(path, "utf8"))
const TRACKED_NAMES = new Set(
  execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .map((path) => basename(path)),
)

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]
const ORDINAL_WORDS = ["zeroth", "first", "second", "third", "fourth", "fifth", "sixth"]
const REPEAT_WORDS = ["never", "once", "twice"]
const RANGE_UNITS: Readonly<Record<string, string>> = { d: "days", m: "months" }
const NUMBER_WORD = new RegExp(
  `(?<![\\w-])(?:${[...COUNT_WORDS.slice(2), ...ORDINAL_WORDS.slice(2), ...REPEAT_WORDS.slice(2)].join("|")})(?![\\w-])`,
  "giu",
)
const NUMBER = /(?<![\w./:@-])\d+(?:[.:/]\d+)*(?:%|\+)?(?![\w-])/gu
const DATE = /\b(?:\d{1,2} )?(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/gu
const FENCED_CODE = /^ *```[\s\S]*?^ *```$/gmu
const LIST_MARKER = /^\s*\d+\.\s/gmu
const SNAPSHOT = /^## Performance\n[\s\S]*?(?=^The following decisions)/gmu
const INLINE_CODE = /`(?<code>[^`\n]+)`/gu
const LINK_TARGET = /\]\((?<target>[^)\s]+)\)/gu
const AUTOLINK = /<https?:\/\/[^>]+>/gu
const COMMAND = /\bbun run (?<script>[\w:<>*|-]+)/gu
const SCRIPT_NAME = /^[a-z]+(?::[a-z<>*|-]+)+$/u
const LINT_RULE = /^[a-z-]+\/[a-z-]+$/u
const FILE_EXTENSION = /\.(?:css|html|json|jsonc|lock|md|mdx|nvmrc|png|ts|tsx|txt|webp|xml|yml)$/u
const PLACEHOLDER = /[<{*$|]/u
const STRUCTURE_BLOCK = /^```text\n(?<tree>[\s\S]*?)^```$/mu
const STRUCTURE_LINE = /^(?<indent> *)(?<name>\S+)/u
const EXTERNAL_LINK = /^(?:https?:|mailto:|#)/u
const EXTENSION_ONLY = /^\.[a-z]+$/u
const STRUCTURE_INDENT = 2

const ACCEPTED = [
  "Article 11a",
  "answers 403",
  "103 Early Hints",
  "get `.2`, `.3`, and so on",
  "the last two say why",
  "a second import",
  "Importing it twice",
  "does not deploy twice",
  "`/index`",
  "`/_serverFn`",
  "`/assets/`",
]

const majorOf = (packageName: string): string =>
  zod
    .object({ version: zod.string() })
    .parse(readJson(`node_modules/${packageName}/package.json`))
    .version.split(".")[0] ?? ""

const greatestDivisor = (first: number, second: number): number => (second === 0 ? first : greatestDivisor(second, first % second))

const listOf = (items: readonly string[]): string => new Intl.ListFormat("en", { type: "conjunction" }).format(items)

const stringsOf = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value]
  }

  return typeof value === "object" && value !== null ? Object.values(value).flatMap((nested) => stringsOf(nested)) : []
}

const RATIO_DIVISOR = greatestDivisor(COURSE_COVER_SIZE.width, COURSE_COVER_SIZE.height)
const WCAG_VERSIONS = [
  ...new Set(
    [...readFileSync("e2e/fixtures/accessibility.ts", "utf8").matchAll(/"wcag(?<major>\d)(?<minor>\d?)a+"/gu)].map(
      ({ groups }) => `${groups?.["major"] ?? ""}.${(groups?.["minor"] ?? "").padEnd(1, "0")}`,
    ),
  ),
]
const SERVED_PATHS = new Set([...stringsOf(ROUTES), ...LIVE_SITE_CHECKS.map(({ path }) => path), API_BASE_PATH])
const SERVED_PREFIXES: readonly string[] = [MEDIA_PATH_PREFIX, COURSE_COVER_PATH_PREFIX]
const REMOTION_PORT = /--port=(?<port>\d+)/u.exec(readFileSync("remotion/package.json", "utf8"))?.groups?.["port"] ?? ""
const CLOUDFLARE_CREDENTIALS = readFileSync(".env.example", "utf8").match(/^CLOUDFLARE_\w+=/gmu)?.length ?? 0
const LOOPBACK_PORTS = new Set([
  LOCAL_SERVER.PORT,
  ...Array.from({ length: TEST_SERVER_PORTS.LAST - TEST_SERVER_PORTS.FIRST + 1 }, (_, index) => TEST_SERVER_PORTS.FIRST + index),
])

interface Claim {
  readonly name: string
  readonly pattern: RegExp
  readonly value: (groups: Readonly<Record<string, string>>) => boolean
}

const equals =
  (expected: Readonly<Record<string, number | string>>) =>
  (groups: Readonly<Record<string, string>>): boolean =>
    Object.entries(expected).every(([group, value]) => groups[group] === String(value))

const CLAIMS: readonly Claim[] = [
  { name: "the Bun version", pattern: /\*\*Bun (?<version>[\d.]+)\*\*/gu, value: equals({ version: REPOSITORY_FACTS.bunVersion }) },
  {
    name: "the Node.js version",
    pattern: /\*\*Node\.js (?<version>[\d.]+) or newer\*\*/gu,
    value: equals({ version: REPOSITORY_FACTS.nodeVersion }),
  },
  {
    name: "the Node.js release line",
    pattern: /(?<version>[\d.]+) is the \w+ \d{4} security release of the Node (?<major>\d+) LTS line/gu,
    value: equals({ major: REPOSITORY_FACTS.nodeVersion.split(".")[0] ?? "", version: REPOSITORY_FACTS.nodeVersion }),
  },
  { name: "the test password", pattern: /the password `(?<password>[^`]+)`/gu, value: equals({ password: REPOSITORY_FACTS.testPassword }) },
  {
    name: "a loopback port",
    pattern: /(?:localhost|127\.0\.0\.1|-iTCP):(?<port>\d+)/gu,
    value: ({ port }) => LOOPBACK_PORTS.has(Number(port)),
  },
  {
    name: "the ports the test build trusts",
    pattern: /trusts port (?<local>\d+) and ports (?<first>\d+) to (?<last>\d+)/gu,
    value: equals({ first: TEST_SERVER_PORTS.FIRST, last: TEST_SERVER_PORTS.LAST, local: LOCAL_SERVER.PORT }),
  },
  {
    name: "the browser suite's shards",
    pattern: /suite runs on (?<count>\w+) parallel shards/gu,
    value: equals({ count: COUNT_WORDS[REPOSITORY_FACTS.e2eShards] ?? "" }),
  },
  {
    name: "the coverage shards",
    pattern: /coverage run on (?<count>\w+) parallel shards/gu,
    value: equals({ count: COUNT_WORDS[REPOSITORY_FACTS.vitestShards] ?? "" }),
  },
  {
    name: "the emails per recipient and hour",
    pattern: /limited to (?<count>\w+) of each kind per hour/gu,
    value: equals({ count: COUNT_WORDS[RECIPIENT_EMAILS_PER_HOUR] ?? "" }),
  },
  {
    name: "the coverage threshold",
    pattern: /requires \*\*(?<threshold>\d+)% statements, branches, functions, and lines\*\*/gu,
    value: equals({ threshold: REPOSITORY_FACTS.coverageThreshold }),
  },
  {
    name: "the dashboard periods",
    pattern: /over the last (?<ranges>\d+ \w+, \d+ \w+ or \d+ \w+) in UTC/gu,
    value: ({ ranges }) =>
      ranges ===
      TIME_RANGES.map((range) => `${range.slice(0, -1)} ${RANGE_UNITS[range.slice(-1)] ?? ""}`)
        .join(", ")
        .replace(/, (?<last>[^,]+)$/u, " or $<last>"),
  },
  {
    name: "the course cover",
    pattern: /cropped to (?<width>\d+):(?<height>\d+) in the browser, stored in R2 at (?<widths>\w+) widths/gu,
    value: equals({
      height: COURSE_COVER_SIZE.height / RATIO_DIVISOR,
      width: COURSE_COVER_SIZE.width / RATIO_DIVISOR,
      widths: COUNT_WORDS[COURSE_COVER_WIDTHS.length] ?? "",
    }),
  },
  {
    name: "the checkout tiers",
    pattern: /the (?<count>\w+) checkout tiers/gu,
    value: equals({ count: COUNT_WORDS[LICENSE_TIERS.length] ?? "" }),
  },
  {
    name: "the journey's upgrade test",
    pattern: /A (?<ordinal>\w+) test upgrades Core/gu,
    value: equals({ ordinal: ORDINAL_WORDS[LICENSE_TIERS.length + 1] ?? "" }),
  },
  {
    name: "the Cloudflare credentials",
    pattern: /set the (?<count>\w+) `CLOUDFLARE_\*` credentials/gu,
    value: equals({ count: COUNT_WORDS[CLOUDFLARE_CREDENTIALS] ?? "" }),
  },
  {
    name: "the live check retries",
    pattern: /It retries each failing check (?<count>\w+)\./gu,
    value: equals({ count: REPEAT_WORDS[LIVE_SITE_CHECK_RETRY_DELAYS_MS.length] ?? "" }),
  },
  { name: "the Remotion Studio port", pattern: /Remotion Studio runs on port (?<port>\d+)/gu, value: equals({ port: REMOTION_PORT }) },
  { name: "the React major", pattern: /React (?<major>\d+), TypeScript/gu, value: equals({ major: REPOSITORY_FACTS.reactMajor }) },
  { name: "the Tailwind CSS major", pattern: /Tailwind CSS (?<major>\d+)/gu, value: equals({ major: majorOf("tailwindcss") }) },
  { name: "the Video.js major", pattern: /Video\.js (?<major>\d+) playback/gu, value: equals({ major: majorOf("@videojs/react") }) },
  { name: "the CLI API base path", pattern: /under `(?<path>\/api\/[^`]+)`/gu, value: equals({ path: API_BASE_PATH }) },
  {
    name: "the WCAG versions",
    pattern: /WCAG (?<versions>[\d., and]+) A and AA/gu,
    value: ({ versions }) => versions === listOf(WCAG_VERSIONS).replace(", and", " and"),
  },
  {
    name: "the full checkout",
    pattern: /\(`(?<depth>fetch-depth: 0)` and `(?<filter>filter: tree:0)`\)/gu,
    value: ({ depth = "", filter = "" }) => WORKFLOWS.some((workflow) => workflow.includes(depth) && workflow.includes(filter)),
  },
  { name: "the local admin", pattern: /Sign in as `(?<email>[^`]+)` and open/gu, value: equals({ email: LOCAL_ADMIN.EMAIL }) },
]

const claimProblems = (readme: string): string[] =>
  CLAIMS.flatMap(({ name, pattern, value }) => {
    const matches = [...readme.matchAll(pattern)]

    if (matches.length === 0) {
      return [`README.md no longer states ${name}`]
    }

    return matches
      .filter(({ groups = {} }) => !value(groups))
      .map(([text]) => `README.md states ${name} as "${text}", which the code contradicts`)
  })

const unverifiedNumbers = (readme: string): string[] => {
  const prose = [...CLAIMS.map(({ pattern }) => pattern), FENCED_CODE, SNAPSHOT, DATE, AUTOLINK, LINK_TARGET, LIST_MARKER].reduce(
    (text, pattern) => text.replaceAll(pattern, " "),
    ACCEPTED.reduce((text, phrase) => text.replaceAll(phrase, " "), readme),
  )

  return [...(prose.match(NUMBER) ?? []), ...(prose.match(NUMBER_WORD) ?? [])]
}

const isScript = (name: string): boolean => {
  const [prefix = ""] = name.split(PLACEHOLDER)

  return name === prefix ? SCRIPTS.some((script) => isKeyPath(script, name)) : SCRIPTS.some((script) => script.startsWith(prefix))
}

const isScriptFamily = (code: string): boolean => SCRIPTS.some((script) => script.startsWith(`${code.split(":")[0] ?? ""}:`))

const commandProblems = (readme: string): string[] => {
  const names = [
    ...[...readme.matchAll(COMMAND)].map(({ groups }) => groups?.["script"] ?? ""),
    ...[...readme.matchAll(INLINE_CODE)]
      .map(({ groups }) => groups?.["code"] ?? "")
      .filter((code) => SCRIPT_NAME.test(code) && isScriptFamily(code)),
  ]

  return [...new Set(names)].filter((name) => !isScript(name)).map((name) => `README.md names ${name}, which package.json does not define`)
}

const isKeyPath = (script: string, name: string): boolean => script === name || script.startsWith(`${name}:`)

const isIgnored = (path: string): boolean => {
  try {
    execFileSync("git", ["check-ignore", "--quiet", path])
    return true
  } catch {
    return false
  }
}

const isServedPath = (path: string): boolean => {
  const [, locale = ""] = path.split("/")
  const unlocalized = I18N.SUPPORTED_LOCALES.some((supported) => supported === locale) ? path.slice(locale.length + 1) : path

  return SERVED_PATHS.has(unlocalized) || SERVED_PREFIXES.some((prefix) => `${unlocalized}/`.startsWith(`${prefix}/`))
}

const pathProblem = (path: string): string[] => {
  if (path.startsWith("/")) {
    return isServedPath(path) ? [] : [`README.md names ${path}, which the Worker does not serve`]
  }

  if (path.startsWith("@")) {
    return DEPENDENCIES.has(path.split("/").slice(0, 2).join("/")) ? [] : [`README.md names ${path}, which package.json does not depend on`]
  }

  const exists = [path, `src/${path}`].some((candidate) => existsSync(candidate)) || TRACKED_NAMES.has(path) || isIgnored(path)

  if (exists || (EXTENSION_ONLY.test(path) && FILE_EXTENSION.test(path))) {
    return []
  }

  if (LINT_RULE.test(path)) {
    return LINT_CONFIG.includes(`"${path}"`) ? [] : [`README.md names ${path}, which vite.config.ts does not configure`]
  }

  return [`README.md names ${path}, which does not exist`]
}

const pathsOf = (readme: string): string[] => {
  const linked = [...readme.matchAll(LINK_TARGET)].map(({ groups }) => (groups?.["target"] ?? "").split("#")[0] ?? "")
  const quoted = [...readme.replaceAll(FENCED_CODE, " ").matchAll(INLINE_CODE)]
    .map(({ groups }) => (groups?.["code"] ?? "").split("#")[0] ?? "")
    .filter((code) => !code.includes(" ") && (code.includes("/") || FILE_EXTENSION.test(code)) && !SCRIPT_NAME.test(code))

  return [...linked, ...quoted].filter(
    (path) => path.length > 0 && !EXTERNAL_LINK.test(path) && !PLACEHOLDER.test(path) && !ACCEPTED.includes(`\`${path}\``),
  )
}

const structurePaths = (readme: string): string[] => {
  const parents: string[] = []

  return (STRUCTURE_BLOCK.exec(readme)?.groups?.["tree"] ?? "").split("\n").flatMap((line) => {
    const { indent = "", name = "" } = STRUCTURE_LINE.exec(line)?.groups ?? {}
    const depth = indent.length / STRUCTURE_INDENT
    parents.length = depth
    parents.push(name)

    return name.length > 0 ? [posix.join(...parents).replaceAll(/\{\w+\}/gu, "*")] : []
  })
}

const listedCodes = (readme: string, pattern: RegExp): string[] =>
  [...(pattern.exec(readme)?.[0] ?? "").matchAll(INLINE_CODE)].map(({ groups }) => groups?.["code"] ?? "")

const LEGAL_PATHS = [
  ROUTES.AFFILIATES,
  ...FOOTER_NAVIGATION.filter(({ key }) => key === FOOTER_COLUMN.LEGAL).flatMap(({ links }) => links.map(({ to }) => to)),
]

describe("README.md", () => {
  it("states only values the code defines", () => {
    expect(claimProblems(README)).toEqual([])
  })

  it("types no number that a claim does not check against the code", () => {
    expect(unverifiedNumbers(README)).toEqual([])
  })

  it("runs only scripts that package.json defines", () => {
    expect(commandProblems(README)).toEqual([])
  })

  it("names only files, routes and lint rules that exist", () => {
    expect([...new Set(pathsOf(README))].flatMap((path) => pathProblem(path))).toEqual([])
    expect(structurePaths(README).filter((path) => globSync(path).length === 0)).toEqual([])
  })

  it("lists the seeded accounts, the locales, the legal routes and the live checks the code defines", () => {
    expect(
      listedCodes(README, /^\| Role[\s\S]*?\n\n/mu)
        .filter((code) => code.includes("@"))
        .toSorted(),
    ).toStrictEqual(seededAccounts.map(([email]) => email).toSorted())
    expect(listedCodes(README, /The supported locales are [^\n]+/u).slice(0, -1)).toStrictEqual([...I18N.SUPPORTED_LOCALES])
    expect(listedCodes(README, /The public legal routes are [^.]+\./u).toSorted()).toStrictEqual([...new Set(LEGAL_PATHS)].toSorted())
    expect(
      new Set(
        listedCodes(README, /it requests the paths that `LIVE_SITE_CHECKS` names [^\n]+?sign-in through `[^`]+`/u).filter((code) =>
          code.startsWith("/"),
        ),
      ),
    ).toStrictEqual(new Set(LIVE_SITE_CHECKS.map(({ path }) => path)))
  })

  it("fails a README that types a value the code no longer has", () => {
    const stale = README.replace(`**Bun ${REPOSITORY_FACTS.bunVersion}**`, "**Bun 1.4.4**").replace(
      "ten parallel shards",
      "nine parallel shards",
    )

    expect(claimProblems(stale)).toEqual([
      'README.md states the Bun version as "**Bun 1.4.4**", which the code contradicts',
      `README.md states the browser suite's shards as "suite runs on nine parallel shards", which the code contradicts`,
    ])
    expect(claimProblems("")).toContain("README.md no longer states the Bun version")
  })

  it("fails a number, a script or a path that nothing checks", () => {
    expect(unverifiedNumbers("Deploys take 7 minutes on five runners.")).toEqual(["7", "five"])
    expect(commandProblems("Run `bun run db:wipe` or `orders:refund:<environment>`.")).toEqual([
      "README.md names db:wipe, which package.json does not define",
      "README.md names orders:refund:<environment>, which package.json does not define",
    ])
    expect(
      ["src/lib/gone.ts", "/admin/payments", "radius/no-rounded", "/de-DE/docs", ".env.development"].flatMap((path) => pathProblem(path)),
    ).toEqual([
      "README.md names src/lib/gone.ts, which does not exist",
      "README.md names /admin/payments, which the Worker does not serve",
      "README.md names radius/no-rounded, which vite.config.ts does not configure",
    ])
  })
})
