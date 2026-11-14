import { globSync } from "node:fs"
import { basename } from "node:path"
import sharp from "sharp"
import { expect, it } from "vite-plus/test"

import { LANDING_VIDEO_SIZES } from "~/src/data/landing-videos"

const MOTION_ASSETS = "src/presentation/assets/motion"
const RESPONSIVE_POSTER_PATTERN = /-(?<width>\d+)\.(?:avif|webp)$/u

const RESPONSIVE_POSTERS = globSync(`${MOTION_ASSETS}/*.{avif,webp}`).filter((path) => RESPONSIVE_POSTER_PATTERN.test(path))

const imageSize = async (path: string): Promise<{ height: number | undefined; width: number | undefined }> => {
  const { height, width } = await sharp(path).metadata()

  return { height, width }
}

it.each(Object.entries(LANDING_VIDEO_SIZES))("keeps the %s poster at the size of its composition", async (id, size) => {
  expect(await imageSize(`${MOTION_ASSETS}/${id}.webp`)).toStrictEqual(size)
})

it.each(RESPONSIVE_POSTERS)("renders the responsive poster %s at the width its name and srcset declare", async (path) => {
  const declared = RESPONSIVE_POSTER_PATTERN.exec(basename(path))?.groups?.["width"]
  const { width } = await imageSize(path)

  expect(width).toBe(Number(declared))
})
