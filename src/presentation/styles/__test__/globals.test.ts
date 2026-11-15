import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, it } from "vite-plus/test"

import { excludeUnusedPrimitives, unusedPrimitives, unusedPrimitivesPlugin } from "~/scripts/unused-primitives"

const PRIMITIVES = "src/presentation/components/shadcn"
const TAILWIND_IMPORT = '@import "tailwindcss" source("../../");'

const importOf = (name: string): string => `import { Part } from "~/src/presentation/components/shadcn/${name}"\n`

const project = mkdtempSync(join(tmpdir(), "primitives-"))

const files = {
  [`${PRIMITIVES}/button.tsx`]: "",
  [`${PRIMITIVES}/calendar.tsx`]: "",
  [`${PRIMITIVES}/dialog.tsx`]: importOf("button"),
  [`${PRIMITIVES}/tabs.tsx`]: "",
  "src/platform/testing/render.tsx": importOf("calendar"),
  "src/routes/__test__/page.test.tsx": importOf("tabs"),
  "src/routes/page.tsx": importOf("dialog"),
}

for (const [path, source] of Object.entries(files)) {
  mkdirSync(dirname(join(project, path)), { recursive: true })
  writeFileSync(join(project, path), source)
}

afterAll(() => {
  rmSync(project, { force: true, recursive: true })
})

describe("unused shadcn primitives", () => {
  it("finds the primitives that no application source imports, directly or through another primitive", () => {
    expect(unusedPrimitives(project)).toStrictEqual(["calendar", "tabs"])
  })

  it("leaves each of them out of the Tailwind scan, right after the Tailwind import", () => {
    expect(excludeUnusedPrimitives(`${TAILWIND_IMPORT}\n@import "./fonts.css";\n`, project)).toBe(
      [
        TAILWIND_IMPORT,
        '@source not "../components/shadcn/calendar.tsx";',
        '@source not "../components/shadcn/tabs.tsx";',
        '@import "./fonts.css";',
        "",
      ].join("\n"),
    )
  })

  it("keeps the stylesheet free of any hand-written list, which the plugin derives for the project's own areas", () => {
    const css = readFileSync("src/presentation/styles/globals.css", "utf8")

    expect(css).toContain(TAILWIND_IMPORT)
    expect(css).not.toContain("../components/shadcn/")
    expect(excludeUnusedPrimitives(css, process.cwd())).toContain("../components/shadcn/")
    expect(unusedPrimitivesPlugin()).toMatchObject({ enforce: "pre", name: "unused-primitives" })
  })
})
