import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import { z } from "zod/v4"

import { SOURCE_PATTERNS, commentProblems, commentsOf, sourceFiles } from "~/scripts/check-comments"
import { COMMENT_MESSAGES } from "~/scripts/code-style-lint-plugin"

const SCRIPT = "scripts/check-comments.ts"
const SPEC = "e2e/specs/probe.spec.ts"
const STYLES = "src/presentation/styles/probe.css"
const COMPONENT = "src/presentation/components/custom/probe.tsx"

const { scripts } = z.object({ scripts: z.record(z.string(), z.string()) }).parse(JSON.parse(readFileSync("package.json", "utf8")))

describe("commentsOf", () => {
  it("reads every comment of a TypeScript file with its line and column", () => {
    expect(commentsOf(SPEC, "const first = 1\n  // A capitalised line\nconst second = 2 /* trailing */\n")).toStrictEqual([
      { column: 3, line: 2, text: " A capitalised line" },
      { column: 18, line: 3, text: " trailing " },
    ])
  })

  it("reads JSX and JSDoc comments, and nothing that only looks like one", () => {
    const source = [
      "#!/usr/bin/env bun",
      "/** A JSDoc block */",
      "const url = 'https://saasyland.com/docs'",
      String.raw`const pattern = /^\/\/ /u`,
      "const Link = () => <a href={url}>https://saasyland.com {/* A comment in JSX */}</a>",
    ].join("\n")

    expect(commentsOf(COMPONENT, source)).toStrictEqual([
      { column: 1, line: 2, text: "* A JSDoc block " },
      { column: 57, line: 5, text: " A comment in JSX " },
    ])
  })

  it("reads stylesheet comments, but not a glob in a string or a path in url()", () => {
    const source = '@source not "../../**/*.{test,spec}.{ts,tsx}";\n.cover { background: url(a/*b*/c); }\n/* A style comment */\n'

    expect(commentsOf(STYLES, source)).toStrictEqual([{ column: 1, line: 3, text: "A style comment" }])
  })

  it("refuses a file it cannot parse, rather than pass comments it never read", () => {
    expect(() => commentsOf(SPEC, "const = 1")).toThrow(`${SPEC} does not parse`)
  })
})

describe("commentProblems", () => {
  it("names the file, the line and the fix of each comment", () => {
    expect(commentProblems(SPEC, "const first = 1 // Why\n")).toStrictEqual([`${SPEC}:1:17: ${COMMENT_MESSAGES.comment}`])
  })

  it("reports the directive that the linter honours before any rule sees it", () => {
    expect(commentProblems(COMPONENT, "/* oxlint-disable code-style/no-comments */\nconst first = 1\n")).toStrictEqual([
      `${COMPONENT}:1:1: ${COMMENT_MESSAGES.directive}`,
    ])
  })

  it("accepts a file without comments", () => {
    expect(commentProblems(STYLES, ".cover { color: red; }\n")).toStrictEqual([])
  })
})

describe("sourceFiles", () => {
  const files = sourceFiles()

  it("reads the browser suite, the scripts, the configuration and the stylesheets, which the linter does not all read", () => {
    expect(files).toStrictEqual(
      expect.arrayContaining(["e2e/global-setup.ts", SCRIPT, "vite.config.ts", "src/presentation/styles/globals.css"]),
    )
  })

  it("leaves out the generated files that .gitattributes marks", () => {
    expect(files).not.toContain("src/routeTree.gen.ts")
    expect(files).not.toContain("src/types/worker-configuration.d.ts")
  })

  it("lists every kind of source and style file", () => {
    expect(SOURCE_PATTERNS).toStrictEqual(expect.arrayContaining(["*.css", "*.js", "*.mjs", "*.ts", "*.tsx"]))
  })

  it("runs before the linter in the check and in the pre-commit hook", () => {
    expect(scripts["check:comments"]).toBe(`bun ${SCRIPT}`)
    expect(scripts["check"]).toMatch(/^bun run generate:cn && bun run check:comments && /u)
    expect(scripts["check:pre-commit"]).toMatch(/^bun run generate:cn && bun run check:comments && /u)
  })
})
