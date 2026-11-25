import { globSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { featureRemoval, isInFootprint, problemLines, removedFeatures, removedNames, removedNamespaces } from "~/scripts/check-features"
import { FEATURE, FEATURES, FEATURE_SCENARIO, FEATURE_SCENARIOS } from "~/scripts/features"
import { pruneProject } from "~/scripts/prune-references"

const ROUTES_FILE = "src/routes.ts"
const COURSES_PAGE = "src/routes/_site._marketing.courses.tsx"
const PAGE = "src/presentation/components/custom/probe.tsx"
const GENERATED = "src/routeTree.gen.ts"
const CONFIRM_MESSAGES = "messages/en-US/pages.newsletter.confirm.json"
const LANDING_MESSAGES = "messages/en-US/pages.landing.json"
const SOURCES: Readonly<Record<string, string>> = {
  [GENERATED]: 'import { ROUTES } from "./routes.ts"\n',
  [PAGE]:
    'import { ROUTES } from "~/src/routes"\n\nexport const LINKS = [ROUTES.HOME, ROUTES.NEWSLETTER.CONFIRM, ROUTES.AUTH.INVITE]\nexport const NAMESPACES = ["pages.landing", "pages.newsletter.confirm"]\nexport const PAGE = ROUTES.NEWSLETTER.BASE\n',
  [ROUTES_FILE]: [
    'const ADMIN = "/admin"',
    'const NEWSLETTER = "/newsletter"',
    "",
    "export const ROUTES = {",
    "  ADMIN: {",
    "    INDEX: ADMIN,",
    '    NEWSLETTER: { COMPOSE: "/admin/newsletter/compose", INDEX: "/admin/newsletter", ISSUES: "/admin/newsletter/issues" },',
    '    USERS: { ALL: "/admin/users/all", INVITATIONS: "/admin/users/invitations" },',
    "  },",
    '  API: { AUTH: { ACCEPT_INVITATION: "/invitation/accept", GET_SESSION: "/get-session" } },',
    '  AUTH: { INVITE: "/auth/invite", SIGN_IN: "/auth/sign-in" },',
    '  HOME: "/",',
    '  NEWSLETTER: { BASE: NEWSLETTER, CONFIRM: "/newsletter/confirm", UNSUBSCRIBE: "/newsletter/unsubscribe" },',
    "} as const",
    "",
    "export const REQUEST_RENDERED_ROUTES: readonly string[] = [ROUTES.ADMIN.INDEX, ROUTES.NEWSLETTER.BASE]",
    "",
  ].join("\n"),
}
const FILES = [GENERATED, PAGE, ROUTES_FILE, CONFIRM_MESSAGES, LANDING_MESSAGES]
const PROJECT = { generated: new Set([GENERATED]), read: (file: string): string => SOURCES[file] ?? "" }

describe("removedFeatures", () => {
  it("removes every feature that requires a removed one, directly or through another, and sorts them", () => {
    expect(removedFeatures([FEATURE.LEGAL])).toStrictEqual([FEATURE.LEGAL, FEATURE.LICENSE])
    expect(removedFeatures([FEATURE.POLAR])).toStrictEqual([
      FEATURE.BILLING,
      FEATURE.LICENSE,
      FEATURE.PAYMENTS,
      FEATURE.POLAR,
      FEATURE.PRODUCTS,
    ])
  })

  it("removes only the features asked for when nothing requires them", () => {
    expect(removedFeatures([FEATURE.NEWSLETTER, FEATURE.AFFILIATES])).toStrictEqual([FEATURE.AFFILIATES, FEATURE.NEWSLETTER])
  })
})

describe("isInFootprint", () => {
  it("matches a file against the globs of the removed features only", () => {
    expect(isInFootprint(COURSES_PAGE, [FEATURE.COURSES])).toBe(true)
    expect(isInFootprint(COURSES_PAGE, [FEATURE.NEWSLETTER])).toBe(false)
    expect(isInFootprint(ROUTES_FILE, [FEATURE.COURSES])).toBe(false)
  })
})

describe("removedNames", () => {
  it("collects, by file, the names the removed features own in files they keep", () => {
    expect(removedNames([FEATURE.NEWSLETTER, FEATURE.TEAM])).toStrictEqual(
      new Map([
        [ROUTES_FILE, [FEATURES[FEATURE.NEWSLETTER].names, FEATURES[FEATURE.TEAM].names].flatMap((names) => names?.[ROUTES_FILE] ?? [])],
      ]),
    )
    expect(removedNames([FEATURE.ANALYTICS])).toStrictEqual(new Map())
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

describe("featureRemoval", () => {
  it("keeps the files outside the footprints and prunes what the kept ones name of the removed features", () => {
    const removal = featureRemoval([FEATURE.NEWSLETTER, FEATURE.TEAM], FILES, PROJECT)

    expect(removal.removed).toStrictEqual([FEATURE.NEWSLETTER, FEATURE.TEAM])
    expect(removal.kept).toStrictEqual([GENERATED, PAGE, ROUTES_FILE, LANDING_MESSAGES])
    expect(removal.sources).toStrictEqual(
      new Map([
        [
          PAGE,
          'import { ROUTES } from "~/src/routes"\n\nexport const LINKS = [ROUTES.HOME]\nexport const NAMESPACES = ["pages.landing"]\nexport const PAGE = ROUTES.NEWSLETTER.BASE\n',
        ],
        [
          ROUTES_FILE,
          [
            'const ADMIN = "/admin"',
            "",
            "export const ROUTES = {",
            "  ADMIN: {",
            "    INDEX: ADMIN,",
            '    USERS: { ALL: "/admin/users/all" },',
            "  },",
            '  API: { AUTH: { GET_SESSION: "/get-session" } },',
            '  AUTH: { SIGN_IN: "/auth/sign-in" },',
            '  HOME: "/",',
            "} as const",
            "",
            "export const REQUEST_RENDERED_ROUTES: readonly string[] = [ROUTES.ADMIN.INDEX]",
            "",
          ].join("\n"),
        ],
      ]),
    )
    expect(problemLines(removal.problems)).toStrictEqual([
      `${PAGE}:5:21: \`ROUTES.NEWSLETTER\` names what the removed features take away, and no array element, object property, JSX element, test, statement or declaration around it can go with it`,
    ])
  })

  it("keeps no test file the pruning leaves without a test", () => {
    const spec = "src/presentation/components/custom/__test__/probe.component.test.tsx"
    const sources: Readonly<Record<string, string>> = {
      ...SOURCES,
      [spec]:
        'import { expect, it } from "vite-plus/test"\n\nimport { ROUTES } from "~/src/routes"\n\nit("links the newsletter", () => {\n  expect(ROUTES.NEWSLETTER.BASE).toBe("/newsletter")\n})\n',
    }
    const removal = featureRemoval([FEATURE.NEWSLETTER], [...FILES, spec], { ...PROJECT, read: (file) => sources[file] ?? "" })

    expect(removal.kept).not.toContain(spec)
    expect(removal.sources.has(spec)).toBe(false)
  })

  it("changes nothing when the kept files name nothing the removed features take away", () => {
    expect(featureRemoval([FEATURE.ANALYTICS], FILES, PROJECT)).toMatchObject({ problems: [], sources: new Map() })
  })
})

describe("the feature footprints in scripts/features.ts", () => {
  it.each(Object.entries(FEATURES).flatMap(([feature, { files }]) => files.map((glob) => ({ feature, glob }))))(
    "$feature: $glob matches a file of the project",
    ({ glob }) => {
      expect(globSync(glob)).not.toStrictEqual([])
    },
  )

  it.each(
    Object.values(FEATURE).flatMap((feature) =>
      [...removedNames(removedFeatures([feature]))].map(([file, list]) => ({ feature, file, list })),
    ),
  )("$feature: every name it and the features that require it own in $file is declared there and can be pruned", ({ file, list }) => {
    const { problems } = pruneProject({
      deleted: new Set(),
      generated: new Set(),
      kept: [file],
      names: new Map([[file, list]]),
      namespaces: new Set(),
      read: (path) => readFileSync(path, "utf8"),
    })

    expect(problems).toStrictEqual([])
  })

  it("leaves out every website-only feature in each scenario, which the templates never generate", () => {
    for (const features of Object.values(FEATURE_SCENARIOS)) {
      expect(features).toEqual(expect.arrayContaining([...FEATURE_SCENARIOS[FEATURE_SCENARIO.WEBSITE_ONLY]]))
    }
  })
})
