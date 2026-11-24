import { globSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { AREA, AREAS, AREA_SCENARIO, AREA_SCENARIOS } from "~/scripts/areas"
import { areaRemoval, isInFootprint, problemLines, removedAreas, removedNames, removedNamespaces } from "~/scripts/check-areas"
import { pruneProject } from "~/scripts/prune-references"

const ROUTES_BARREL = "src/routes.ts"
const AUTH_SHARED = "src/areas/auth.shared.ts"
const CORE_SHARED = "src/areas/core.shared.ts"
const COURSES_SHARED = "src/areas/courses.shared.ts"
const PAGE = "src/presentation/components/custom/probe.tsx"
const GENERATED = "src/routeTree.gen.ts"
const CONFIRM_MESSAGES = "messages/en-US/pages.newsletter.confirm.json"
const LANDING_MESSAGES = "messages/en-US/pages.landing.json"
const SOURCES: Readonly<Record<string, string>> = {
  [AUTH_SHARED]: [
    'export const ACCEPT_INVITATION = "/auth/invite"',
    'export const ADMIN = "/admin"',
    'export const ADMIN_USERS_INVITATIONS = "/admin/users/invitations"',
    'export const API_AUTH = { ACCEPT_INVITATION: "/invitation/accept", GET_SESSION: "/get-session" } as const',
    "",
  ].join("\n"),
  [CORE_SHARED]: 'export const HOME = "/"\n',
  [COURSES_SHARED]: 'export const COURSES = "/courses"\n',
  [GENERATED]: 'import { COURSES } from "./areas/courses.shared.ts"\n',
  [PAGE]:
    'import * as ROUTES from "~/src/routes"\n\nexport const LINKS = [ROUTES.HOME, ROUTES.COURSES, ROUTES.ACCEPT_INVITATION]\nexport const NAMESPACES = ["pages.landing", "pages.newsletter.confirm"]\nexport const PAGE = ROUTES.COURSES\n',
  [ROUTES_BARREL]:
    'export { ACCEPT_INVITATION, ADMIN } from "./areas/auth.shared.ts"\nexport { HOME } from "./areas/core.shared.ts"\nexport { COURSES } from "./areas/courses.shared.ts"\n',
}
const FILES = [AUTH_SHARED, CORE_SHARED, COURSES_SHARED, GENERATED, PAGE, ROUTES_BARREL, CONFIRM_MESSAGES, LANDING_MESSAGES]
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
    expect(isInFootprint(COURSES_SHARED, [AREA.COURSES])).toBe(true)
    expect(isInFootprint(COURSES_SHARED, [AREA.NEWSLETTER])).toBe(false)
    expect(isInFootprint(CORE_SHARED, [AREA.COURSES])).toBe(false)
  })
})

describe("removedNames", () => {
  it("collects, by file, the names the removed areas own in files they keep", () => {
    expect(removedNames([AREA.NEWSLETTER, AREA.TEAM])).toStrictEqual(new Map(Object.entries(AREAS[AREA.TEAM].names ?? {})))
    expect(removedNames([AREA.NEWSLETTER])).toStrictEqual(new Map())
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
    const removal = areaRemoval([AREA.COURSES, AREA.NEWSLETTER, AREA.TEAM], FILES, PROJECT)

    expect(removal.removed).toStrictEqual(removedAreas([AREA.COURSES, AREA.NEWSLETTER, AREA.TEAM]))
    expect(removal.kept).toStrictEqual([AUTH_SHARED, CORE_SHARED, GENERATED, PAGE, ROUTES_BARREL, LANDING_MESSAGES])
    expect(removal.sources).toStrictEqual(
      new Map([
        [AUTH_SHARED, 'export const ADMIN = "/admin"\nexport const API_AUTH = { GET_SESSION: "/get-session" } as const\n'],
        [
          PAGE,
          'import * as ROUTES from "~/src/routes"\n\nexport const LINKS = [ROUTES.HOME]\nexport const NAMESPACES = ["pages.landing"]\nexport const PAGE = ROUTES.COURSES\n',
        ],
        [ROUTES_BARREL, 'export { ADMIN } from "./areas/auth.shared.ts"\nexport { HOME } from "./areas/core.shared.ts"\n'],
      ]),
    )
    expect(problemLines(removal.problems)).toStrictEqual([
      `${PAGE}:5:21: \`ROUTES.COURSES\` names what the removed areas take away, and no array element, object property or JSX element around it can go with it`,
    ])
  })

  it("changes nothing when the kept files name nothing the removed areas take away", () => {
    expect(areaRemoval([AREA.AFFILIATES], FILES, PROJECT)).toMatchObject({ problems: [], sources: new Map() })
  })
})

describe("the area footprints in scripts/areas.ts", () => {
  it.each(Object.entries(AREAS).flatMap(([area, { files }]) => files.map((glob) => ({ area, glob }))))(
    "$area: $glob matches a file of the project",
    ({ glob }) => {
      expect(globSync(glob)).not.toStrictEqual([])
    },
  )

  it.each(Object.entries(AREAS).flatMap(([area, { names = {} }]) => Object.entries(names).map(([file, list]) => ({ area, file, list }))))(
    "$area: every name it owns in $file is declared there",
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
