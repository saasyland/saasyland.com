import { describe, expect, expectTypeOf, it } from "vite-plus/test"

import { BROWSER_AREAS } from "~/src/areas/browser"
import type * as AREAS from "~/src/areas/browser.entries"

import type { FileRouteTypes } from "~/src/routeTree.gen"

type DeclaredUserTab = Extract<(typeof AREAS)[keyof typeof AREAS], { readonly userTabs: unknown }>["userTabs"][number]

const keysOf = (entries: readonly { readonly key: string }[]): string[] => entries.map(({ key }) => key)

const CONTRIBUTIONS = {
  accountDeletion: keysOf(BROWSER_AREAS.flatMap(({ accountDeletion = [] }) => accountDeletion)),
  appOverview: keysOf(BROWSER_AREAS.flatMap(({ appOverview = [] }) => appOverview)),
  commandSearches: BROWSER_AREAS.flatMap(({ commandSearches = [], name }) => commandSearches.map(({ key }) => `${name}.${key}`)),
  signUpIntros: keysOf(BROWSER_AREAS.flatMap(({ signUpIntros = [] }) => signUpIntros)),
  signUpNotices: keysOf(BROWSER_AREAS.flatMap(({ signUpNotices = [] }) => signUpNotices)),
  userProfile: keysOf(BROWSER_AREAS.flatMap(({ userProfile = [] }) => userProfile)),
  userTabs: keysOf(BROWSER_AREAS.flatMap(({ userTabs = [] }) => userTabs)),
}

const USER_TABS = BROWSER_AREAS.flatMap(({ userTabs = [] }) => userTabs)

const APP_BADGES = BROWSER_AREAS.flatMap(({ appBadges = [] }) => appBadges)

const LAZY_COMPONENTS = [
  BROWSER_AREAS.flatMap(({ accountDeletion = [] }) => accountDeletion.map(({ Notice }) => Notice)),
  BROWSER_AREAS.flatMap(({ appBadges = [] }) => appBadges.map(({ Badge }) => Badge)),
  BROWSER_AREAS.flatMap(({ appOverview = [] }) => appOverview.map(({ Section }) => Section)),
  BROWSER_AREAS.flatMap(({ signUpIntros = [] }) => signUpIntros.map(({ Intro }) => Intro)),
  BROWSER_AREAS.flatMap(({ signUpNotices = [] }) => signUpNotices.map(({ Notice }) => Notice)),
  BROWSER_AREAS.flatMap(({ userProfile = [] }) => userProfile.map(({ Section }) => Section)),
].flat()

describe("what the areas add to the admin console and the customer workspace", () => {
  it.each(Object.entries(CONTRIBUTIONS))("gives each of the %s entries of every area its own key", (_field, keys) => {
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("gives each user management tab its own page and orders them apart", () => {
    expect(new Set(USER_TABS.map(({ to }) => to)).size).toBe(USER_TABS.length)
    expect(new Set(USER_TABS.map(({ order }) => order)).size).toBe(USER_TABS.length)
  })

  it("points every user management tab at a path of the route tree", () => {
    expectTypeOf<DeclaredUserTab["to"]>().toExtend<FileRouteTypes["to"]>()
  })

  it("loads every component an area adds on demand, which the page's loader preloads", async () => {
    expect(LAZY_COMPONENTS.every(({ preload }) => typeof preload === "function")).toBe(true)
    await expect(
      Promise.all(
        LAZY_COMPONENTS.map(async ({ preload }) => {
          await preload?.()
        }),
      ),
    ).resolves.toHaveLength(LAZY_COMPONENTS.length)
  })

  it("gives each workspace menu entry at most one badge", () => {
    expect(new Set(APP_BADGES.map(({ to }) => to)).size).toBe(APP_BADGES.length)
  })
})
