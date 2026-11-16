import { readFileSync, statSync } from "node:fs"
import { posix } from "node:path"
import * as zod from "zod"

const ROOT_ALIAS = "~/"
const RESOLVED_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]

const IMPORT_SPECIFIER = /^(?:import|export) (?:[^"]*? from )?"(?<specifier>[^"]+)"/gmu
const LOCAL_SPECIFIER = /^(?:\.|~\/)/u

const specifierSchema = zod.object({ specifier: zod.string() })

const isFile = (path: string): boolean => statSync(path, { throwIfNoEntry: false })?.isFile() === true

const resolveImport = (file: string, specifier: string): string => {
  const base = specifier.startsWith(ROOT_ALIAS) ? specifier.slice(ROOT_ALIAS.length) : posix.join(posix.dirname(file), specifier)
  const resolved = RESOLVED_SUFFIXES.map((suffix) => `${base}${suffix}`).find((candidate) => isFile(candidate))
  if (resolved === undefined) {
    throw new Error(`${file} imports ${specifier}, which resolves to no file`)
  }
  return resolved
}

export const importSpecifiers = (file: string): string[] =>
  [...readFileSync(file, "utf8").matchAll(IMPORT_SPECIFIER)].map((match) => specifierSchema.parse(match.groups).specifier)

const localImports = (file: string): string[] =>
  importSpecifiers(file)
    .filter((specifier) => LOCAL_SPECIFIER.test(specifier))
    .map((specifier) => resolveImport(file, specifier))

export const importClosure = (entries: readonly string[]): string[] => {
  const files = new Set(entries)
  for (const file of files) {
    for (const imported of localImports(file)) {
      files.add(imported)
    }
  }
  return [...files]
}
