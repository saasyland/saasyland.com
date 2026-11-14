import { expect, it } from "vite-plus/test"

import { ROOT_COMPONENTS } from "~/src/data/root"
import * as AREA_ROOT_COMPONENTS from "~/src/data/root.entries"

it("mounts every component an area adds to the root once, under a key no other area uses", () => {
  const keys = ROOT_COMPONENTS.map(({ key }) => key)

  expect(ROOT_COMPONENTS).toStrictEqual(Object.values(AREA_ROOT_COMPONENTS).flat())
  expect(new Set(keys).size).toBe(keys.length)
})
