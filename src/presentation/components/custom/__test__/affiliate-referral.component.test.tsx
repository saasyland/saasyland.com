import { render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import * as affonsoProgram from "~/src/integrations/affonso/affonso.program"

import { AFFILIATE_TERMS } from "~/src/data/affiliates"

import { AffiliateReferral } from "~/src/presentation/components/custom/affiliate-referral"

const PROGRAM_ID = "cmh7q6ayf0000jz08program"
const PIXEL_SELECTOR = `script[src="${AFFONSO.PIXEL_URL}"]`

const visit = (path: string): void => {
  globalThis.history.replaceState(null, "", path)
}

const programId = (value: string | undefined) => vi.spyOn(affonsoProgram, "getAffonsoProgramId").mockResolvedValue(value)

afterEach(() => {
  vi.restoreAllMocks()
  visit("/")
})

describe("affiliate referral", () => {
  it("asks the server nothing and loads no script on a visit without a referral", () => {
    const getProgramId = programId(PROGRAM_ID)
    visit("/blog?utm_source=newsletter")

    render(<AffiliateReferral />)

    expect(getProgramId).not.toHaveBeenCalled()
    expect(document.querySelector(PIXEL_SELECTOR)).toBeNull()
  })

  it.each(AFFONSO.REFERRAL_PARAMS)("recognises ?%s= as a referral and loads nothing where no program is configured", async (param) => {
    const getProgramId = programId(undefined)
    visit(`/blog?${param}=jane`)

    render(<AffiliateReferral />)

    await waitFor(() => {
      expect(getProgramId).toHaveBeenCalledOnce()
    })
    expect(document.querySelector(PIXEL_SELECTOR)).toBeNull()
  })

  it("loads Affonso's script with the program ID and the published cookie duration", async () => {
    programId(PROGRAM_ID)
    visit("/?via=jane")

    render(<AffiliateReferral />)

    await waitFor(() => {
      expect(document.querySelector(PIXEL_SELECTOR)).not.toBeNull()
    })
    const script = document.querySelector(PIXEL_SELECTOR)
    expect(script).toHaveAttribute("data-affonso", PROGRAM_ID)
    expect(script).toHaveAttribute("data-cookie_duration", String(AFFILIATE_TERMS.COOKIE_DAYS))
    expect(script).toHaveAttribute("async")
  })
})
