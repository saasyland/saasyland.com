import { describe, expect, it } from "vite-plus/test"

import { createSocialCardRenderer } from "~/src/integrations/takumi/takumi.render"

import { SOCIAL_IMAGE } from "~/src/lib/seo"

const PNG_SIGNATURE = Buffer.from("89504E470D0A1A0A", "hex")
const WIDTH_OFFSET = 16
const HEIGHT_OFFSET = 20

const expectSocialImage = (png: Buffer): void => {
  expect(png.subarray(0, PNG_SIGNATURE.length)).toStrictEqual(PNG_SIGNATURE)
  expect(png.readUInt32BE(WIDTH_OFFSET)).toBe(SOCIAL_IMAGE.WIDTH)
  expect(png.readUInt32BE(HEIGHT_OFFSET)).toBe(SOCIAL_IMAGE.HEIGHT)
}

describe("createSocialCardRenderer", () => {
  const renderer = createSocialCardRenderer()

  it("renders the site card as a PNG of the social image size", async () => {
    const render = await renderer

    expectSocialImage(await render.site())
  })

  it.each([
    { lang: "en-US", section: "Conventions", title: "Files and naming" },
    { lang: "ja-JP", section: "ブログ", title: "2026 年の SaaS 向け AI コーディングエージェント：リポジトリが成果を決める理由" },
    { lang: "uk-UA", section: undefined, title: "Документація" },
    {
      lang: "de-DE",
      section: "Blog",
      title: "Supastarter vs. SaaSy Land: Löschen, was Sie nicht brauchen, oder es gar nicht erst erzeugen",
    },
  ] as const)("renders a $lang page card", async (card) => {
    const render = await renderer

    expectSocialImage(await render.page(card))
  })

  it("renders different titles into different images", async () => {
    const render = await renderer
    const [first, second] = await Promise.all([
      render.page({ lang: "en-US", title: "First" }),
      render.page({ lang: "en-US", title: "Second" }),
    ])

    expect(first.equals(second)).toBe(false)
  })
})
