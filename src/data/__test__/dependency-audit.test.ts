import { expect, it } from "vite-plus/test"
import * as zod from "zod"

import { AUDIT_EXCEPTIONS } from "~/src/data/dependency-audit"

const GITHUB_ADVISORY = /^GHSA(?:-[23456789cfghjmpqrvwx]{4}){3}$/u

const exceptionSchema = zod.object({
  advisory: zod.string().regex(GITHUB_ADVISORY),
  expiresOn: zod.iso.date(),
  package: zod.string().min(1),
  reason: zod.string().min(1),
  reviewedOn: zod.iso.date(),
  tracking: zod.url({ protocol: /^https$/u }),
})

it("names each exception by its GitHub advisory and package, with the reason, the review and expiry dates and a link that tracks the fix", () => {
  expect(zod.array(exceptionSchema).safeParse(AUDIT_EXCEPTIONS).success).toBe(true)
  expect(new Set(AUDIT_EXCEPTIONS.map(({ advisory, package: name }) => `${name} ${advisory}`)).size).toBe(AUDIT_EXCEPTIONS.length)
})
