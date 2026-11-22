import { globSync } from "node:fs"
import { expect, it } from "vite-plus/test"

import { importClosure, importSpecifiers } from "~/src/platform/testing/lib/import-closure"

const SKELETONS = globSync("src/presentation/components/custom/**/*-pending.tsx").filter((file) => !file.includes("/__test__/"))
const PAGE_PACKAGES = new Set(["@tanstack/react-form", "@tanstack/react-table", "recharts"])

it("keeps forms, tables and charts out of the skeletons, which every page loads with its entry script", () => {
  expect(SKELETONS.length).toBeGreaterThan(0)
  expect(importClosure(SKELETONS).filter((file) => importSpecifiers(file).some((specifier) => PAGE_PACKAGES.has(specifier)))).toStrictEqual(
    [],
  )
})
