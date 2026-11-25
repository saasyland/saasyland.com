import { globSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { AREA, AREAS, AREA_SCENARIO, AREA_SCENARIOS } from "~/scripts/areas"
import { areaRemoval, isInFootprint, problemLines, removedAreas, removedNames, removedNamespaces } from "~/scripts/check-areas"
import { pruneProject } from "~/scripts/prune-references"

const ROUTES_FILE = "src/routes.ts"
const COURSES_PAGE = "src/routes/_site._marketing.courses.tsx"
const PAGE = "src/presentation/components/custom/probe.tsx"
const GENERATED = "src/routeTree.gen.ts"
const CONFIRM_MESSAGES = "messages/en-US/pages.newsletter.confirm.json"
const LANDING_MESSAGES = "messages/en-US/pages.landing.json"
const SOURCES: Readonly<Record<string, string>> = {
  [GENERATED]: 'import { NEWSLETTER } from "./routes.ts"\n',
  [PAGE]:
    'import * as ROUTES from "~/src/routes"\n\nexport const LINKS = [ROUTES.HOME, ROUTES.NEWSLETTER, ROUTES.ACCEPT_INVITATION]\nexport const NAMESPACES = ["pages.landing", "pages.newsletter.confirm"]\nexport const PAGE = ROUTES.NEWSLETTER\n',
  [ROUTES_FILE]: [
    'export const ACCEPT_INVITATION = "/auth/invite"',
    'export const ADMIN = "/admin"',
    'export const ADMIN_USERS_INVITATIONS = "/admin/users/invitations"',
    'export const API_AUTH = { ACCEPT_INVITATION: "/invitation/accept", GET_SESSION: "/get-session" } as const',
    'export const HOME = "/"',
    'export const NEWSLETTER = "/newsletter"',
    'export const NEWSLETTER_CONFIRM = "/newsletter/confirm"',
    'export const NEWSLETTER_UNSUBSCRIBE = "/newsletter/unsubscribe"',
    "export const REQUEST_RENDERED_ROUTES: readonly string[] = [ADMIN, NEWSLETTER]",
    "",
  ].join("\n"),
}
const FILES = [GENERATED, PAGE, ROUTES_FILE, CONFIRM_MESSAGES, LANDING_MESSAGES]
const PROJECT = { generated: new Set([GENERATED]), read: (file: string): string => SOURCES[file] ?? "" }

describe("removedAreas", () => {
  it("removes every area that requires a removed one, directly or through another, and sorts them", () => {
    expect(removedAreas([AREA.LEGAL])).toStrictEqual([AREA.LEGAL, AREA.LICENSE])
    expect(removedAreas([AREA.POLAR])).toStrictEqual([AREA.BILLING, AREA.LICENSE, AREA.PAYMENTS, AREA.POLAR, AREA.PRODUCTS])
  })

  it("removes only the areas asked for when nothing requires them", () => {
    expect(removedAreas([AREA.NEWSLETTER, AREA.AFFILIATES])).toStrictEqual([AREA.AFFILIATES, AREA.NEWSLETTER])
  })
})

describe("isInFootprint", () => {
  it("matches a file against the globs of the removed areas only", () => {
    expect(isInFootprint(COURSES_PAGE, [AREA.COURSES])).toBe(true)
    expect(isInFootprint(COURSES_PAGE, [AREA.NEWSLETTER])).toBe(false)
    expect(isInFootprint(ROUTES_FILE, [AREA.COURSES])).toBe(false)
  })
})

describe("removedNames", () => {
  it("collects, by file, the names the removed areas own in files they keep", () => {
    expect(removedNames([AREA.NEWSLETTER, AREA.TEAM])).toStrictEqual(
      new Map([[ROUTES_FILE, [AREAS[AREA.NEWSLETTER].names, AREAS[AREA.TEAM].names].flatMap((names) => names?.[ROUTES_FILE] ?? [])]]),
    )
    expect(removedNames([AREA.ANALYTICS])).toStrictEqual(new Map())
  })
})

describe("removedNamespaces", () => {
  it("is the namespace of each removed message file that no kept locale still has", () => {
    expect(
      removedNamespaces(
        [CONFIRM_MESSAGES, "messages/pl-PL/pages.newsletter.confirm.json", "messages/en-US/pages.landing.json", "src/data/newsletter.json"],
        ["messages/pl-PL/pages.landing.json", "src/data/pages.json"],
      ),
    ).toStrictEqual(new Set(["pages.newsletter.confirm"]))
  })
})

describe("areaRemoval", () => {
  it("keeps the files outside the footprints and prunes what the kept ones name of the removed areas", () => {
    const removal = areaRemoval([AREA.NEWSLETTER, AREA.TEAM], FILES, PROJECT)

    expect(removal.removed).toStrictEqual([AREA.NEWSLETTER, AREA.TEAM])
    expect(removal.kept).toStrictEqual([GENERATED, PAGE, ROUTES_FILE, LANDING_MESSAGES])
    expect(removal.sources).toStrictEqual(
      new Map([
        [
          PAGE,
          'import * as ROUTES from "~/src/routes"\n\nexport const LINKS = [ROUTES.HOME]\nexport const NAMESPACES = ["pages.landing"]\nexport const PAGE = ROUTES.NEWSLETTER\n',
        ],
        [
          ROUTES_FILE,
          [
            'export const ADMIN = "/admin"',
            'export const API_AUTH = { GET_SESSION: "/get-session" } as const',
            'export const HOME = "/"',
            "export const REQUEST_RENDERED_ROUTES: readonly string[] = [ADMIN]",
            "",
          ].join("\n"),
        ],
      ]),
    )
    expect(problemLines(removal.problems)).toStrictEqual([
      `${PAGE}:5:21: \`ROUTES.NEWSLETTER\` names what the removed areas take away, and no array element, object property, JSX element, test, statement or declaration around it can go with it`,
    ])
  })

  it("keeps no test file the pruning leaves without a test", () => {
    const spec = "src/presentation/components/custom/__test__/probe.component.test.tsx"
    const sources: Readonly<Record<string, string>> = {
      ...SOURCES,
      [spec]:
        'import { expect, it } from "vite-plus/test"\n\nimport * as ROUTES from "~/src/routes"\n\nit("links the newsletter", () => {\n  expect(ROUTES.NEWSLETTER).toBe("/newsletter")\n})\n',
    }
    const removal = areaRemoval([AREA.NEWSLETTER], [...FILES, spec], { ...PROJECT, read: (file) => sources[file] ?? "" })

    expect(removal.kept).not.toContain(spec)
    expect(removal.sources.has(spec)).toBe(false)
  })

  it("changes nothing when the kept files name nothing the removed areas take away", () => {
    expect(areaRemoval([AREA.ANALYTICS], FILES, PROJECT)).toMatchObject({ problems: [], sources: new Map() })
  })
})

describe("the area footprints in scripts/areas.ts", () => {
  it.each(Object.entries(AREAS).flatMap(([area, { files }]) => files.map((glob) => ({ area, glob }))))(
    "$area: $glob matches a file of the project",
    ({ glob }) => {
      expect(globSync(glob)).not.toStrictEqual([])
    },
  )

  it.each(Object.values(AREA).flatMap((area) => [...removedNames(removedAreas([area]))].map(([file, list]) => ({ area, file, list }))))(
    "$area: every name it and the areas that require it own in $file is declared there and can be pruned",
    ({ file, list }) => {
      const { problems } = pruneProject({
        deleted: new Set(),
        generated: new Set(),
        kept: [file],
        names: new Map([[file, list]]),
        namespaces: new Set(),
        read: (path) => readFileSync(path, "utf8"),
      })

      expect(problems).toStrictEqual([])
    },
  )

  it("leaves out every website-only area in each scenario, which the templates never generate", () => {
    for (const areas of Object.values(AREA_SCENARIOS)) {
      expect(areas).toEqual(expect.arrayContaining([...AREA_SCENARIOS[AREA_SCENARIO.WEBSITE_ONLY]]))
    }
  })
})
