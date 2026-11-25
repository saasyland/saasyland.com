import { describe, expect, it } from "vite-plus/test"

import {
  BUSINESS_LOGO_PATH_PREFIX,
  BUSINESS_LOGO_STORED_TYPES,
  businessLogoPath,
  logoContentType,
  logoEntries,
  logoExtension,
  logoFormData,
  logoObjectKey,
} from "~/src/modules/business-profile/business-profile.logo"

const LOGO_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000b0b0"

describe("the business logo", () => {
  it("keys a logo by its ID and stored extension and serves it under the media path", () => {
    const key = logoObjectKey({ extension: "webp", logoId: LOGO_ID })

    expect(key).toBe(`logos/${LOGO_ID}.webp`)
    expect(businessLogoPath(key)).toBe(`${BUSINESS_LOGO_PATH_PREFIX}/${LOGO_ID}.webp`)
  })

  it("maps each stored type to its extension and back, and nothing else", () => {
    expect(logoExtension(BUSINESS_LOGO_STORED_TYPES.png)).toBe("png")
    expect(logoExtension(BUSINESS_LOGO_STORED_TYPES.webp)).toBe("webp")
    expect(logoExtension("image/gif")).toBeUndefined()
    expect(logoContentType(`logos/${LOGO_ID}.png`)).toBe(BUSINESS_LOGO_STORED_TYPES.png)
    expect(logoContentType(`logos/${LOGO_ID}.gif`)).toBeUndefined()
  })

  it("carries the image in its upload form", () => {
    const image = new File(["logo"], "blob", { type: BUSINESS_LOGO_STORED_TYPES.webp })

    const { image: sent } = logoEntries(logoFormData(image))

    expect(sent).toBeInstanceOf(File)
    expect(logoEntries(new FormData())).toStrictEqual({ image: null })
  })
})
