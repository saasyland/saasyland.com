import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { stubImageEncoding } from "~/src/platform/testing/mocks/canvas"

import { encodeContainedImage, encodeImages } from "~/src/lib/image-encoding"

const WEBP = "image/webp"
const JPEG = "image/jpeg"

const SIZES = [
  { height: 270, width: 480 },
  { height: 900, width: 1600 },
] as const

const encode = () => encodeImages({ fallbackType: JPEG, file: new Blob(["source"]), preferredType: WEBP, quality: 0.8, sizes: SIZES })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("encodeImages", () => {
  it("crops the image to fill each size from its centre and encodes it in the preferred type", async () => {
    const { bitmap, drawings } = stubImageEncoding()

    const images = await encode()

    expect(images.map(({ height, image, width }) => [width, height, image.type])).toStrictEqual([
      [480, 270, WEBP],
      [1600, 900, WEBP],
    ])
    expect(drawings).toStrictEqual([
      { args: [-30, 0, 540, 270], height: 270, smoothing: "high", width: 480 },
      { args: [-100, 0, 1800, 900], height: 900, smoothing: "high", width: 1600 },
    ])
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it("falls back to the other type in a browser that cannot encode the preferred one", async () => {
    stubImageEncoding({ encodes: [JPEG] })

    const images = await encode()

    expect(images.map(({ image }) => image.type)).toStrictEqual([JPEG, JPEG])
  })

  it("fails in a browser that cannot draw, and still releases the decoded image", async () => {
    const { bitmap } = stubImageEncoding({ draws: false })

    await expect(encode()).rejects.toThrow("This browser cannot draw images.")
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})

const PNG = "image/png"

const contain = (maxSide: number) =>
  encodeContainedImage({ fallbackType: PNG, file: new Blob(["source"]), maxSide, preferredType: WEBP, quality: 0.9 })

describe("encodeContainedImage", () => {
  it("scales the whole image down to fit the longest side, keeping its proportions", async () => {
    const { bitmap, drawings } = stubImageEncoding()

    const image = await contain(500)

    expect(image.type).toBe(WEBP)
    expect(drawings).toStrictEqual([{ args: [0, 0, 500, 250], height: 250, smoothing: "high", width: 500 }])
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it("keeps a smaller image at its own size", async () => {
    const { drawings } = stubImageEncoding()

    await contain(4000)

    expect(drawings).toStrictEqual([{ args: [0, 0, 2000, 1000], height: 1000, smoothing: "high", width: 2000 }])
  })

  it("keeps at least one pixel on a side that would round to none", async () => {
    const { drawings } = stubImageEncoding()

    await contain(1)

    expect(drawings.map(({ height, width }) => [width, height])).toStrictEqual([[1, 1]])
  })

  it("falls back to a type that keeps transparency in a browser that cannot encode the preferred one", async () => {
    stubImageEncoding({ encodes: [PNG] })

    await expect(contain(500)).resolves.toHaveProperty("type", PNG)
  })

  it("releases the decoded image when it cannot draw", async () => {
    const { bitmap } = stubImageEncoding({ draws: false })

    await expect(contain(500)).rejects.toThrow("This browser cannot draw images.")
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})
