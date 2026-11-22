import { globSync } from "node:fs"
import { expect, it } from "vite-plus/test"

import { importClosure, importSpecifiers } from "~/src/platform/testing/lib/import-closure"

const SKELETONS = globSync("src/presentation/components/custom/**/*-pending.tsx").filter((file) => !file.includes("/__test__/"))
const PAGE_PACKAGES = new Set(["@tanstack/react-form", "@tanstack/react-table", "recharts"])
const PAGE_MODULES = new Set([
  "src/data/repository-facts.ts",
  "src/lib/checkout-overlay.ts",
  "src/presentation/components/custom/app/checkout.tsx",
  "src/presentation/components/custom/pricing.tsx",
])

it("keeps forms, tables and charts out of the skeletons, which every page loads with its entry script", () => {
  expect(SKELETONS.length).toBeGreaterThan(0)
  expect(importClosure(SKELETONS).filter((file) => importSpecifiers(file).some((specifier) => PAGE_PACKAGES.has(specifier)))).toStrictEqual(
    [],
  )
})

it("keeps the pricing table, the checkout and the repository facts out of the skeletons", () => {
  expect(importClosure(SKELETONS).filter((file) => PAGE_MODULES.has(file))).toStrictEqual([])
})
