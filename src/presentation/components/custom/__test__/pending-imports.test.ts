import { globSync } from "node:fs"
import { expect, it } from "vite-plus/test"

import { importClosure, importSpecifiers } from "~/src/platform/testing/lib/import-closure"

const SKELETONS = globSync("src/presentation/components/custom/**/*-pending.tsx").filter((file) => !file.includes("/__test__/"))
const FORM_PACKAGE = "@tanstack/react-form"

it("keeps every form out of the skeletons, which every page loads with its entry script", () => {
  expect(SKELETONS.length).toBeGreaterThan(0)
  expect(importClosure(SKELETONS).filter((file) => importSpecifiers(file).includes(FORM_PACKAGE))).toStrictEqual([])
})
