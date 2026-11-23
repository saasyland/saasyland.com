import { existsSync, globSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { BROWSER_AREAS } from "~/src/areas/browser"
import * as NAVIGATION_AREAS from "~/src/areas/navigation.entries"

const AREA_MESSAGES = /^messages\/[^/]+\/[a-z]+\.(?<area>[a-z-]+)\.json$/u

const messageFileSchema = zod.object({ area: zod.string() })

const NAVIGATION_NAMES = Object.values(NAVIGATION_AREAS).map(({ name }) => name)

const DASHBOARD_NAMES = BROWSER_AREAS.filter(({ dashboard = [] }) => dashboard.length > 0).map(({ name }) => name)

const KINDS = [
  ["navigation", NAVIGATION_NAMES],
  ["dashboard", DASHBOARD_NAMES],
] as const

const areasWithFiles = (kind: string): string[] => [
  ...new Set(globSync(`messages/*/${kind}.*.json`).map((file) => messageFileSchema.parse(AREA_MESSAGES.exec(file)?.groups).area)),
]

describe("area message files", () => {
  it.each(KINDS.flatMap(([kind, names]) => names.map((name) => [kind, name] as const)))(
    "labels the %s entries of the %s area in its own file in every locale",
    (kind, name) => {
      expect(I18N.SUPPORTED_LOCALES.filter((locale) => !existsSync(`messages/${locale}/${kind}.${name}.json`))).toStrictEqual([])
    },
  )

  it.each(KINDS)("keeps a %s file only for an area that declares its entries", (kind, names) => {
    expect(areasWithFiles(kind).toSorted()).toStrictEqual([...names].toSorted())
  })
})
