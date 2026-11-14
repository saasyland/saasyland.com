import { globSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import { expect, it } from "vite-plus/test"

const SHADCN_DIRECTORY = "src/presentation/components/shadcn"
const SCANNED_SOURCES = "src/**/*.{ts,tsx}"
const UNSCANNED_SOURCES = /\.(?:test|spec)\.tsx?$|\/__test__\/|^src\/platform\/testing\/|^src\/presentation\/components\/shadcn\//u
const PRIMITIVE_IMPORT = /~\/src\/presentation\/components\/shadcn\/(?<name>[a-z-]+)"/gu
const EXCLUDED_PRIMITIVES = /@source not "\.\.\/components\/shadcn\/\{(?<names>[a-z,-]+)\}\.tsx";/u

const importedPrimitives = (path: string): string[] =>
  [...readFileSync(path, "utf8").matchAll(PRIMITIVE_IMPORT)].flatMap((match) => match.groups?.["name"] ?? [])

const usedPrimitives = (): Set<string> => {
  const sources = globSync(SCANNED_SOURCES).filter((path) => !UNSCANNED_SOURCES.test(path))
  const used = new Set(sources.flatMap((path) => importedPrimitives(path)))

  for (const name of used) {
    for (const dependency of importedPrimitives(`${SHADCN_DIRECTORY}/${name}.tsx`)) {
      used.add(dependency)
    }
  }

  return used
}

it("leaves out of the Tailwind scan exactly the shadcn primitives that nothing imports", () => {
  const css = readFileSync("src/presentation/styles/globals.css", "utf8")
  const excluded = EXCLUDED_PRIMITIVES.exec(css)?.groups?.["names"]?.split(",")
  const used = usedPrimitives()
  const unused = globSync(`${SHADCN_DIRECTORY}/*.tsx`)
    .map((path) => basename(path, ".tsx"))
    .filter((name) => !used.has(name))
    .toSorted()

  expect(excluded).toStrictEqual(unused)
})
