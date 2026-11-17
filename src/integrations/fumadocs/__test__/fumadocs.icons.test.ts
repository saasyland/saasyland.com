import { globSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import zod from "zod/v4"

import { DOCS_ICONS, docsIcon } from "~/src/integrations/fumadocs/fumadocs.icons"

const metaSchema = zod.object({ icon: zod.string().optional() })

const META_ICONS = new Set(
  globSync("content/docs/**/meta.*.json").flatMap((file) => metaSchema.parse(JSON.parse(readFileSync(file, "utf8"))).icon ?? []),
)

describe("docs icons", () => {
  it("imports exactly the icons the meta files name", () => {
    expect([...META_ICONS].toSorted()).toStrictEqual(Object.keys(DOCS_ICONS).toSorted())
  })

  it("renders the named icon and nothing for a folder without one", () => {
    expect(docsIcon("Rocket")).toMatchObject({ type: DOCS_ICONS["Rocket"] })
    expect(docsIcon(undefined)).toBeUndefined()
  })
})
