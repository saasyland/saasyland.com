import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { analyzeModule } from "~/scripts/module-bindings"

const ROUTES_FILE = "src/routes.ts"

const NAVIGATION_FILE = "src/data/navigation.ts"

const NAVIGATION_IMPORTS: ReadonlySet<string> = new Set(["lucide-react", "~/src/data/navigation.constants", "~/src/routes"])

const importsOf = (file: string): string[] => {
  const { imports, program } = analyzeModule(file, readFileSync(file, "utf8"))
  const statements = program.body.flatMap((statement) => {
    if (statement.type === "ImportDeclaration" || statement.type === "ExportAllDeclaration") {
      return [statement.source.value]
    }

    return statement.type === "ExportNamedDeclaration" && statement.source !== null ? [statement.source.value] : []
  })

  return [...new Set([...statements, ...imports.map(({ source }) => source)])].toSorted()
}

describe("the source layout", () => {
  it(`keeps ${ROUTES_FILE} free of imports, so every runtime can load the paths`, () => {
    expect(importsOf(ROUTES_FILE)).toStrictEqual([])
  })

  it(`lets ${NAVIGATION_FILE} import only what the Remotion project can load`, () => {
    expect(importsOf(NAVIGATION_FILE).filter((source) => !NAVIGATION_IMPORTS.has(source))).toStrictEqual([])
  })
})
