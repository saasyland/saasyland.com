import { build } from "cn/build"
import { compileToTables } from "cn/compiler"
import { createCn } from "cn/config"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { cn } from "~/src/lib/cn"
import config from "~/src/lib/cn.config"

import tables from "~/.source/cn-tables"

const referenceCn = createCn(config)

describe("cn helper", () => {
  it("uses current full compiled tables for every class group and stylesheet theme", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "saasyland-cn-"))
    try {
      const { fullConfig } = await build({ config: "src/lib/cn.config.ts", full: true, out: join(outputDirectory, "cn-tables.ts") })
      const { tables: expected } = compileToTables(fullConfig)

      expect(tables).toEqual(expected)
    } finally {
      await rm(outputDirectory, { force: true, recursive: true })
    }
  })

  it("merges class names and resolves tailwind conflicts", () => {
    expect.hasAssertions()
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("handles omitted optional classes", () => {
    expect.hasAssertions()
    expect(cn("base", "visible")).toBe("base visible")
  })

  it("preserves typography alongside colors and resolves size overrides", () => {
    expect(cn("text-spec", "text-muted-foreground")).toBe("text-spec text-muted-foreground")
    expect(cn("text-muted-foreground", "text-spec")).toBe("text-muted-foreground text-spec")
    expect(cn("text-body", "text-title")).toBe("text-title")
    expect(cn("md:text-body", "md:text-title", "md:text-foreground")).toBe("md:text-title md:text-foreground")
  })

  it.each(config.extend.classGroups["font-size"].flatMap(({ text }) => text))("preserves text-%s alongside its color", (size) => {
    expect(cn(`text-${size}`, "text-muted-foreground")).toBe(`text-${size} text-muted-foreground`)
    expect(cn("text-muted-foreground", `text-${size}`)).toBe(`text-muted-foreground text-${size}`)
  })

  it.each([
    "hover:text-body hover:text-title hover:text-foreground",
    "!text-body !text-title text-muted-foreground",
    "text-body! text-title! text-muted-foreground",
    "text-[length:15px] text-spec text-red-500",
    "text-(length:--custom-size) text-title text-foreground",
    "md:px-2 md:py-3 md:p-4",
    "data-[state=open]:bg-red-500 data-[state=open]:bg-blue-500",
    "[&>p]:text-body [&>p]:text-title [&>p]:text-foreground",
  ])("matches runtime compilation for %s", (classes) => {
    expect(cn(classes)).toBe(referenceCn(classes))
  })
})
