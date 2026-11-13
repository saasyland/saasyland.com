import { describe, expect, it, vi } from "vite-plus/test"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import { affonsoReferralMetadata } from "~/src/integrations/affonso/affonso.referral"

const REFERRAL_ID = "cmh7q6ayf0001jz08referral"
const LONGEST_REFERRAL_ID = "a".repeat(128)

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

const headersWithReferral = (value: string): Headers =>
  new Headers({ cookie: `theme=dark; ${AFFONSO.REFERRAL_COOKIE}=${encodeURIComponent(value)}` })

describe("affonso referral metadata", () => {
  it.each([REFERRAL_ID, LONGEST_REFERRAL_ID, "clk_xyz-789"])("passes the referral %s to the checkout metadata", (referral) => {
    expect(affonsoReferralMetadata(headersWithReferral(referral))).toEqual({ [AFFONSO.METADATA_KEY]: referral })
  })

  it("adds nothing when the visitor carries no referral", () => {
    expect(affonsoReferralMetadata(new Headers({ cookie: "theme=dark" }))).toEqual({})
    expect(affonsoReferralMetadata(new Headers())).toEqual({})
  })

  it.each(["", "a b", "<script>", `${LONGEST_REFERRAL_ID}a`, "ref;id"])("ignores the malformed referral %j", (referral) => {
    expect(affonsoReferralMetadata(headersWithReferral(referral))).toEqual({})
  })
})
