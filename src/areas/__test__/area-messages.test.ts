import { existsSync, globSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import * as NAVIGATION_AREAS from "~/src/areas/navigation.entries"

const NAVIGATION_MESSAGES = /^messages\/[^/]+\/navigation\.(?<area>[a-z-]+)\.json$/u

const messageFileSchema = zod.object({ area: zod.string() })

const NAMES = Object.values(NAVIGATION_AREAS).map(({ name }) => name)

describe("area message files", () => {
  it.each(NAMES)("labels the menu entries of the %s area in its own navigation file in every locale", (name) => {
    expect(I18N.SUPPORTED_LOCALES.filter((locale) => !existsSync(`messages/${locale}/navigation.${name}.json`))).toStrictEqual([])
  })

  it("keeps a navigation file only for an area that declares menu entries", () => {
    const areas = globSync("messages/*/navigation.*.json").map(
      (file) => messageFileSchema.parse(NAVIGATION_MESSAGES.exec(file)?.groups).area,
    )

    expect([...new Set(areas)].toSorted()).toStrictEqual(NAMES.toSorted())
  })
})
