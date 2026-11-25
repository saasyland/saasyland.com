import { existsSync, globSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { importClosure, importSpecifiers, resolveImport } from "~/src/platform/testing/lib/import-closure"

import { BINDING_KIND, type ModuleBinding, analyzeModule } from "~/scripts/module-bindings"

const AREAS_FOLDER = "src/areas"

const ROUTES_FILE = "src/routes.ts"

const NAVIGATION_FILE = "src/data/navigation.ts"

const NAVIGATION_IMPORTS: ReadonlySet<string> = new Set(["lucide-react", "~/src/data/navigation.constants", "~/src/routes"])

const DATA_FOLDER = "src/data"

const DATA_FILES = globSync(`${DATA_FOLDER}/*.ts`)

const DATA_MODULES = import.meta.glob<Readonly<Record<string, unknown>>>("../data/*.ts", { eager: true })

const ZOD = "zod"

const COMPONENT_FILES = globSync("src/{presentation,routes}/**/*.tsx").filter((file) => !file.includes("/__test__/"))

const LAZY_LOADERS = [
  { name: "lazyRouteComponent", source: "@tanstack/react-router" },
  { name: "lazy", source: "react" },
] as const

const CONTROL_PACKAGES = [
  "@tanstack/react-form",
  "@tanstack/react-router",
  "@tanstack/react-table",
  "@videojs/react",
  "react-aria-components",
]

const isLazyLoader = (binding: ModuleBinding): boolean =>
  binding.kind === BINDING_KIND.IMPORT && LAZY_LOADERS.some(({ name, source }) => binding.source === source && binding.path.includes(name))

const isControlPackage = (specifier: string): boolean =>
  CONTROL_PACKAGES.some((control) => specifier === control || specifier.startsWith(`${control}/`))

const lazyModulesOf = (file: string): string[] => {
  const { bindings, imports } = analyzeModule(file, readFileSync(file, "utf8"))

  return bindings.some((binding) => isLazyLoader(binding)) ? imports.map(({ source }) => resolveImport(file, source)) : []
}

const BARRELS = "{e2e,remotion/src,scripts,src}/**/*.entries.ts"

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

  it(`has no ${AREAS_FOLDER}, because each list lives in the file that renders or runs it`, () => {
    expect(existsSync(AREAS_FOLDER)).toBe(false)
  })

  it("loads lazily only what takes no press, so the router fetches every control of a page before React hydrates it", () => {
    const lazyModules = COMPONENT_FILES.flatMap((file) => lazyModulesOf(file))

    expect(lazyModules.length).toBeGreaterThan(0)
    expect(
      importClosure(lazyModules).filter((file) => importSpecifiers(file).some((specifier) => isControlPackage(specifier))),
    ).toStrictEqual([])
  })

  it("has no *.entries.ts barrel, because each list imports its elements from the files that declare them", () => {
    expect(globSync(BARRELS)).toStrictEqual([])
  })

  it(`keeps only data in ${DATA_FOLDER}: no exported function and no ${ZOD} import`, () => {
    const functions = Object.entries(DATA_MODULES).flatMap(([file, exports]) =>
      Object.entries(exports).flatMap(([name, value]) => (typeof value === "function" ? [`${file}: ${name}`] : [])),
    )

    expect(Object.keys(DATA_MODULES)).toHaveLength(DATA_FILES.length)
    expect(functions).toStrictEqual([])
    expect(DATA_FILES.filter((file) => importsOf(file).includes(ZOD))).toStrictEqual([])
  })
})
