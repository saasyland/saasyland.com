import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"
import type { Plugin } from "vite-plus"

const STYLESHEET = /\/src\/presentation\/styles\/globals\.css(?:\?.*)?$/u
const SHADCN_DIRECTORY = "src/presentation/components/shadcn"
const SCANNED_SOURCES = "src/**/*.{ts,tsx}"
const UNSCANNED_SOURCES = /\.(?:test|spec)\.tsx?$|\/__test__\/|^src\/platform\/testing\/|^src\/presentation\/components\/shadcn\//u
const PRIMITIVE_IMPORT = /~\/src\/presentation\/components\/shadcn\/(?<name>[a-z-]+)"/gu
const TAILWIND_IMPORT = /^@import "tailwindcss"[^;]*;$/mu

const importedPrimitives = (root: string, path: string): string[] =>
  [...readFileSync(join(root, path), "utf8").matchAll(PRIMITIVE_IMPORT)].flatMap((match) => match.groups?.["name"] ?? [])

const usedPrimitives = (root: string): Set<string> => {
  const sources = globSync(SCANNED_SOURCES, { cwd: root }).filter((path) => !UNSCANNED_SOURCES.test(path))
  const used = new Set(sources.flatMap((path) => importedPrimitives(root, path)))

  for (const name of used) {
    for (const dependency of importedPrimitives(root, `${SHADCN_DIRECTORY}/${name}.tsx`)) {
      used.add(dependency)
    }
  }

  return used
}

export const unusedPrimitives = (root: string): string[] => {
  const used = usedPrimitives(root)

  return globSync(`${SHADCN_DIRECTORY}/*.tsx`, { cwd: root })
    .map((path) => basename(path, ".tsx"))
    .filter((name) => !used.has(name))
    .toSorted()
}

export const excludeUnusedPrimitives = (css: string, root: string): string =>
  css.replace(TAILWIND_IMPORT, (line) =>
    [line, ...unusedPrimitives(root).map((name) => `@source not "../components/shadcn/${name}.tsx";`)].join("\n"),
  )

export const unusedPrimitivesPlugin = (): Plugin => {
  let root = ""

  return {
    configResolved: ({ root: projectRoot }) => {
      root = projectRoot
    },
    enforce: "pre",
    name: "unused-primitives",
    transform: {
      filter: { id: STYLESHEET },
      handler: (code) => excludeUnusedPrimitives(code, root),
      order: "pre",
    },
  }
}
