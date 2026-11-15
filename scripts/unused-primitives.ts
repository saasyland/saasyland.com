import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"
import type { Plugin } from "vite-plus"

const STYLESHEET = /\/src\/presentation\/styles\/globals\.css(?:\?.*)?$/u
const SHADCN_DIRECTORY = "src/presentation/components/shadcn"
const EXCLUSIONS = ".source/unused-primitives.css"
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

export const writeUnusedPrimitives = (root: string): boolean => {
  const path = join(root, EXCLUSIONS)
  const exclusions = unusedPrimitives(root)
    .map((name) => `@source not "${relative(dirname(path), join(root, SHADCN_DIRECTORY, `${name}.tsx`))}";\n`)
    .join("")

  if (existsSync(path) && readFileSync(path, "utf8") === exclusions) {
    return false
  }

  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, exclusions)

  return true
}

export const excludeUnusedPrimitives = ({ css, root, stylesheet }: { css: string; root: string; stylesheet: string }): string => {
  writeUnusedPrimitives(root)

  return css.replace(TAILWIND_IMPORT, (line) => `${line}\n@import "${relative(dirname(stylesheet), join(root, EXCLUSIONS))}";`)
}

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
      handler: (code, id) => excludeUnusedPrimitives({ css: code, root, stylesheet: id.replace(/\?.*$/u, "") }),
      order: "pre",
    },
  }
}
