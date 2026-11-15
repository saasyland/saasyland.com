import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, it } from "vite-plus/test"

import { excludeUnusedPrimitives, unusedPrimitives, unusedPrimitivesPlugin, writeUnusedPrimitives } from "~/scripts/unused-primitives"

const PRIMITIVES = "src/presentation/components/shadcn"
const EXCLUSIONS = ".source/unused-primitives.css"
const PAGE = "src/routes/page.tsx"
const TAILWIND_IMPORT = '@import "tailwindcss" source("../../");'

const importOf = (name: string): string => `import { Part } from "~/src/presentation/components/shadcn/${name}"\n`

const exclusionOf = (name: string): string => `@source not "../${PRIMITIVES}/${name}.tsx";\n`

const project = mkdtempSync(join(tmpdir(), "primitives-"))

const write = (path: string, source: string): void => {
  mkdirSync(dirname(join(project, path)), { recursive: true })
  writeFileSync(join(project, path), source)
}

const files = {
  [`${PRIMITIVES}/button.tsx`]: "",
  [`${PRIMITIVES}/calendar.tsx`]: "",
  [`${PRIMITIVES}/dialog.tsx`]: importOf("button"),
  [`${PRIMITIVES}/tabs.tsx`]: "",
  [PAGE]: importOf("dialog"),
  "src/platform/testing/render.tsx": importOf("calendar"),
  "src/routes/__test__/page.test.tsx": importOf("tabs"),
}

for (const [path, source] of Object.entries(files)) {
  write(path, source)
}

const exclusions = (): string => readFileSync(join(project, EXCLUSIONS), "utf8")

afterAll(() => {
  rmSync(project, { force: true, recursive: true })
})

describe("unused shadcn primitives", () => {
  it("finds the primitives that no application source imports, directly or through another primitive", () => {
    expect(unusedPrimitives(project)).toStrictEqual(["calendar", "tabs"])
  })

  it("imports the exclusions right after the Tailwind import, from the stylesheet's folder", () => {
    const stylesheet = join(project, "src/presentation/styles/globals.css")

    expect(excludeUnusedPrimitives({ css: `${TAILWIND_IMPORT}\n@import "./fonts.css";\n`, root: project, stylesheet })).toBe(
      [TAILWIND_IMPORT, `@import "../../../${EXCLUSIONS}";`, '@import "./fonts.css";', ""].join("\n"),
    )
    expect(exclusions()).toBe(exclusionOf("calendar") + exclusionOf("tabs"))
  })

  it("rewrites the exclusions only when a source starts or stops importing a primitive, so Tailwind recompiles only then", () => {
    writeUnusedPrimitives(project)
    const written = statSync(join(project, EXCLUSIONS)).mtimeMs

    expect(writeUnusedPrimitives(project)).toBe(false)
    expect(statSync(join(project, EXCLUSIONS)).mtimeMs).toBe(written)

    write(PAGE, importOf("dialog") + importOf("calendar"))
    expect(writeUnusedPrimitives(project)).toBe(true)
    expect(exclusions()).toBe(exclusionOf("tabs"))

    write(PAGE, importOf("dialog"))
    expect(writeUnusedPrimitives(project)).toBe(true)
    expect(exclusions()).toBe(exclusionOf("calendar") + exclusionOf("tabs"))
  })

  it("keeps the stylesheet free of any hand-written list, which the plugin derives for the project's own areas", () => {
    const css = readFileSync("src/presentation/styles/globals.css", "utf8")

    expect(css).toContain(TAILWIND_IMPORT)
    expect(css).not.toContain("../components/shadcn/")
    expect(unusedPrimitivesPlugin()).toMatchObject({ enforce: "pre", name: "unused-primitives" })
  })
})
