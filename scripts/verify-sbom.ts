import { readFileSync } from "node:fs"
import process from "node:process"
import * as zod from "zod"

import { readManifest } from "./dependencies.ts"
import { FAILURE_EXIT_CODE, scriptArguments } from "./run-command.ts"

export const SBOM_FILE = "sbom.cdx.json"

export const SBOM_FORMAT = "CycloneDX"

const NPM_PURL_PREFIX = "pkg:npm/"
const VERSION_SEPARATOR = "@"
const QUALIFIERS = /[?#].*$/u

const componentSchema = zod.object({ purl: zod.string().startsWith(NPM_PURL_PREFIX), version: zod.string().min(1) })
const sbomSchema = zod.object({ bomFormat: zod.literal(SBOM_FORMAT), components: zod.array(componentSchema) })

export const packageOf = (purl: string): string => {
  const coordinates = decodeURIComponent(purl.slice(NPM_PURL_PREFIX.length).replace(QUALIFIERS, ""))

  return coordinates.slice(0, coordinates.lastIndexOf(VERSION_SEPARATOR))
}

export const missingDependencies = (sbom: unknown, dependencies: readonly string[]): string[] => {
  const listed = new Set(sbomSchema.parse(sbom).components.map(({ purl }) => packageOf(purl)))

  return dependencies.filter((name) => !listed.has(name))
}

if (import.meta.main) {
  const [file = SBOM_FILE] = scriptArguments()
  const sbom: unknown = JSON.parse(readFileSync(file, "utf8"))
  const dependencies = Object.keys(readManifest(process.cwd()).dependencies)
  const missing = missingDependencies(sbom, dependencies)

  if (missing.length > 0) {
    console.error(`${file} does not list the production dependencies ${missing.join(", ")}.`)
    process.exit(FAILURE_EXIT_CODE)
  }

  console.log(`${file} lists all ${String(dependencies.length)} production dependencies of package.json.`)
}
