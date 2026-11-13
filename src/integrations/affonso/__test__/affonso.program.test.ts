import { env } from "cloudflare:workers"

import { expect, it } from "vite-plus/test"

import { getAffonsoProgramId } from "~/src/integrations/affonso/affonso.program"

const PROGRAM_ID = "cmh7q6ayf0000jz08program"

it("returns the configured Affonso program ID", async () => {
  env.AFFONSO_PROGRAM_ID = PROGRAM_ID

  await expect(getAffonsoProgramId()).resolves.toBe(PROGRAM_ID)
})

it("returns nothing where affiliate tracking is not configured", async () => {
  delete env.AFFONSO_PROGRAM_ID

  await expect(getAffonsoProgramId()).resolves.toBeUndefined()
})
