import process from "node:process"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { scriptArguments } from "./run-command.ts"
import { readWranglerBindings } from "./wrangler-config.ts"

const PLACEHOLDER_ID = /^[0-]+$/u

const [environment] = scriptArguments()

if (environment !== ENVIRONMENT.PREVIEW && environment !== ENVIRONMENT.PRODUCTION) {
  throw new Error(`Expected ${ENVIRONMENT.PREVIEW} or ${ENVIRONMENT.PRODUCTION}`)
}

const bindings = await readWranglerBindings(environment)
const development = await readWranglerBindings(ENVIRONMENT.DEVELOPMENT)
const bound = new Set(bindings.map(({ binding }) => binding))
const missing = development.filter(({ binding }) => !bound.has(binding))
const placeholders = bindings.filter(({ resource }) => PLACEHOLDER_ID.test(resource))

if (missing.length > 0 || placeholders.length > 0) {
  const names = [...missing, ...placeholders].map(({ binding }) => binding).join(", ")
  throw new Error(`Provision ${names} for ${environment}, then set their IDs or bucket names in wrangler.jsonc. See README.md.`)
}

if (environment === ENVIRONMENT.PRODUCTION) {
  const previewBindings = await readWranglerBindings(ENVIRONMENT.PREVIEW)
  const preview = new Set(previewBindings.map(({ resource }) => resource))
  const shared = bindings.filter(({ resource }) => preview.has(resource)).map(({ resource }) => resource)

  if (shared.length > 0) {
    throw new Error(`Production shares ${shared.join(", ")} with preview. Give production its own resources in wrangler.jsonc.`)
  }
}

process.stdout.write(`Verified the ${environment} bindings: ${[...bound].join(", ")}.\n`)
