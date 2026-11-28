import { describe, expect, it } from "vite-plus/test"

import { pruneProject } from "~/scripts/prune-references"
import { PACKAGE_FILE, pruneScripts, referencesOf, scriptsOf } from "~/scripts/prune-scripts"

const CONFIG = "src/integrations/fumadocs/fumadocs.config.ts"
const CHECK = "scripts/check-content.ts"
const DELETED = new Set([CHECK, CONFIG])

const manifest = (scripts: Readonly<Record<string, string>>): string =>
  `${JSON.stringify({ name: "site", scripts, type: "module" }, undefined, 2)}\n`

const prunedScripts = (scripts: Readonly<Record<string, string>>, directory = "."): Record<string, string> =>
  scriptsOf(pruneScripts({ deleted: DELETED, directory, source: manifest(scripts) }).source)

const prunedProject = (sources: Readonly<Record<string, string>>): ReturnType<typeof pruneProject> =>
  pruneProject({
    deleted: DELETED,
    generated: new Set(),
    kept: Object.keys(sources),
    names: new Map(),
    namespaces: new Set(),
    read: (file) => sources[file] ?? "",
  })

describe("referencesOf", () => {
  it("names every word as a file of the package's directory, reading the value of an option or an assignment", () => {
    expect(referencesOf(`fumadocs-mdx ./${CONFIG} --out=.source`, ".").files).toStrictEqual(["fumadocs-mdx", CONFIG, ".source"])
    expect(referencesOf("remotion bundle src/index.ts", "remotion").files).toStrictEqual([
      "remotion/remotion",
      "remotion/bundle",
      "remotion/src/index.ts",
    ])
  })

  it("names the script that bun runs, past its flags, and no script for another tool's run", () => {
    expect(referencesOf("bun run content", ".").runs).toStrictEqual(["content"])
    expect(referencesOf("bun --env-file=.env.preview run --bun drizzle-kit studio", ".").runs).toStrictEqual(["drizzle-kit"])
    expect(referencesOf("vp test run --project node", ".").runs).toStrictEqual([])
    expect(referencesOf("bun run", ".").runs).toStrictEqual([])
    expect(referencesOf(`bun ${CHECK}`, ".").runs).toStrictEqual([])
  })
})

describe("pruneScripts", () => {
  it("deletes the steps that name a deleted file and keeps the others in their order", () => {
    expect(prunedScripts({ check: `bun run lint && bun ${CHECK} && vp check`, lint: "vp lint" })).toStrictEqual({
      check: "bun run lint && vp check",
      lint: "vp lint",
    })
  })

  it("deletes a script whose every step goes, then every step that runs it, until nothing changes", () => {
    expect(
      prunedScripts({
        build: "rm -rf dist && bun run prepare:content && vp build",
        content: `fumadocs-mdx ./${CONFIG} .source`,
        dev: "bun run content && vp dev",
        "prepare:content": "bun run content",
      }),
    ).toStrictEqual({ build: "rm -rf dist && vp build", dev: "vp dev" })
  })

  it("resolves the files a nested package names from its own directory", () => {
    expect(prunedScripts({ check: "tsc && bun scripts/check-content.ts" }, "remotion")).toStrictEqual({
      check: "tsc && bun scripts/check-content.ts",
    })
  })

  it("keeps every other field of the manifest where it was", () => {
    const { source } = pruneScripts({ deleted: DELETED, directory: ".", source: manifest({ check: `bun ${CHECK}`, lint: "vp lint" }) })

    expect(source).toBe(manifest({ lint: "vp lint" }))
  })

  it("returns the source as it was when no step goes, and reads a manifest without scripts", () => {
    const source = manifest({ lint: "vp lint" })

    expect(pruneScripts({ deleted: DELETED, directory: ".", source }).source).toBe(source)
    expect(pruneScripts({ deleted: DELETED, directory: ".", source: "{}" })).toStrictEqual({ problems: [], source: "{}" })
  })

  it("keeps and reports a step that shares its command with another through an operator other than &&", () => {
    const source = manifest({ check: `bun ${CHECK} || true`, lint: "vp lint" })

    expect(pruneScripts({ deleted: DELETED, directory: ".", source })).toStrictEqual({
      problems: [
        {
          name: "check",
          reason: `\`bun ${CHECK} || true\` names what the removed features take away, and it shares its command with another through an operator other than \`&&\`, so it cannot go alone`,
        },
      ],
      source,
    })
  })
})

describe("pruneProject: package scripts", () => {
  it("prunes the scripts of every package.json it keeps, and only the ones that change", () => {
    const { sources } = prunedProject({
      [PACKAGE_FILE]: manifest({ check: `bun ${CHECK}`, lint: "vp lint" }),
      [`remotion/${PACKAGE_FILE}`]: manifest({ check: `bun ${CHECK}` }),
    })

    expect(sources).toStrictEqual(new Map([[PACKAGE_FILE, manifest({ lint: "vp lint" })]]))
  })

  it("reports a step it cannot prune at the line and column of its script", () => {
    const { problems } = prunedProject({ [PACKAGE_FILE]: manifest({ check: `bun ${CHECK} || true` }) })

    expect(problems.map(({ column, file, line }) => `${file}:${String(line)}:${String(column)}`)).toStrictEqual([`${PACKAGE_FILE}:4:5`])
  })
})
