import { expect, it, vi } from "vite-plus/test"

import { CORE_VITE_PLUGINS } from "~/src/data/core.vite"

vi.mock("@tailwindcss/vite", () => ({ default: () => [{ name: "tailwindcss" }] }))
vi.mock("@vitejs/plugin-react", () => ({ default: () => [{ name: "react" }] }))

const [tailwind, react] = CORE_VITE_PLUGINS

it("builds the styles with Tailwind CSS and compiles React for the app and for Vitest", async () => {
  expect(await tailwind.plugins()).toStrictEqual([[{ name: "tailwindcss" }]])
  expect(await react.plugins()).toStrictEqual([[{ name: "react" }]])
  expect(CORE_VITE_PLUGINS.map(({ vitest }) => vitest)).toStrictEqual([false, true])
})
