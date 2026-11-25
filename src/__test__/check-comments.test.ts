import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { SOURCE_PATTERNS, YAML_COMMENT_MESSAGE, commentProblems, commentsOf, sourceFiles } from "~/scripts/check-comments"
import { COMMENT_MESSAGES } from "~/scripts/code-style-lint-plugin"

const SCRIPT = "scripts/check-comments.ts"
const SPEC = "e2e/specs/probe.spec.ts"
const STYLES = "src/presentation/styles/probe.css"
const COMPONENT = "src/presentation/components/custom/probe.tsx"
const WORKFLOW = ".github/workflows/probe.yml"
const SHA = "0123456789abcdef0123456789abcdef01234567"

const { scripts } = zod.object({ scripts: zod.record(zod.string(), zod.string()) }).parse(JSON.parse(readFileSync("package.json", "utf8")))

describe("commentsOf", () => {
  it("reads every comment of a TypeScript file with its line and column", () => {
    expect(commentsOf(SPEC, "const first = 1\n  // A capitalised line\nconst second = 2 /* trailing */\n")).toStrictEqual([
      { column: 3, endLine: 2, line: 2, text: " A capitalised line" },
      { column: 18, endLine: 3, line: 3, text: " trailing " },
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
      { column: 1, endLine: 2, line: 2, text: "* A JSDoc block " },
      { column: 57, endLine: 5, line: 5, text: " A comment in JSX " },
    ])
  })

  it("reads stylesheet comments, but not a glob in a string or a path in url()", () => {
    const source = '@source not "../../**/*.{test,spec}.{ts,tsx}";\n.cover { background: url(a/*b*/c); }\n/* A style comment */\n'

    expect(commentsOf(STYLES, source)).toStrictEqual([{ column: 1, endLine: 3, line: 3, text: "A style comment" }])
  })

  it("reads the last line of a comment that spans lines, in code and in styles", () => {
    expect(commentsOf(SPEC, "/*\n https://saasyland.com/docs\n*/\nconst first = 1\n")).toStrictEqual([
      { column: 1, endLine: 3, line: 1, text: "\n https://saasyland.com/docs\n" },
    ])
    expect(commentsOf(STYLES, "/*\n https://saasyland.com/docs\n*/\n")).toStrictEqual([
      { column: 1, endLine: 3, line: 1, text: "https://saasyland.com/docs" },
    ])
  })

  it("reads YAML comments, but not a # in a string, a block scalar or an expression", () => {
    const source = [
      "# A heading",
      "jobs:",
      "  check:",
      "    steps:",
      `      - uses: actions/checkout@${SHA} # v4`,
      "      - run: |",
      "          # a shell line",
      `          echo "#hash" \${{ github.sha }}#tail`,
    ].join("\n")

    expect(commentsOf(WORKFLOW, source)).toStrictEqual([
      { column: 1, endLine: 1, line: 1, text: "# A heading" },
      { column: 73, endLine: 5, line: 5, text: "# v4" },
    ])
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

  it("accepts a one-line comment that links to an https:// page or a docs path after a few words", () => {
    const source = [
      "// https://github.com/TanStack/router/issues/8933",
      "const first = 1",
      "",
      "// See /docs/conventions/code-style#comments",
      "const second = 2",
      "const third = 3 /* Upstream bug: https://github.com/oxc-project/oxc/issues/1 */",
      "",
      "const Link = () => <a>{/* https://saasyland.com/docs/conventions */}</a>",
    ].join("\n")

    expect(commentProblems(COMPONENT, source)).toStrictEqual([])
    expect(commentProblems(STYLES, "/* See /docs/conventions/design-system */\n.cover { color: red; }\n")).toStrictEqual([])
  })

  it.each([
    ["a two-line comment", "// https://github.com/TanStack/router/issues/8933\n// The router drops the hash\nconst first = 1\n", [1, 2]],
    ["two links on adjacent lines", "// https://saasyland.com/docs\n// https://saasyland.com/roadmap\nconst first = 1\n", [1, 2]],
    ["a block comment over several lines", "/*\n * https://saasyland.com/docs\n */\nconst first = 1\n", [1]],
    [
      "a link after a long explanation",
      "// The router drops the hash when it redirects, read https://saasyland.com/docs\nconst first = 1\n",
      [1],
    ],
    ["text after the link", "// https://saasyland.com/docs explains why\nconst first = 1\n", [1]],
    ["an explanation without a link", "// Keep this above the router\nconst first = 1\n", [1]],
    ["a link that is not https", "// http://saasyland.com/docs\nconst first = 1\n", [1]],
    ["a site path outside the docs", "// /blog/ai-coding-agent-guardrails\nconst first = 1\n", [1]],
    ["commented-out code with a link", '// fetch("https://saasyland.com/docs")\nconst first = 1\n', [1]],
    ["a TODO with a link", "// TODO: https://github.com/saasyland/saasyland.com/issues/1\nconst first = 1\n", [1]],
  ])("reports %s", (_case, source, lines) => {
    expect(commentProblems(SPEC, source)).toStrictEqual(lines.map((line) => `${SPEC}:${line}:1: ${COMMENT_MESSAGES.comment}`))
  })

  it("reports a directive even when it ends in a link", () => {
    expect(commentProblems(SPEC, "// oxlint-disable-next-line https://saasyland.com/docs\nconst first = 1\n")).toStrictEqual([
      `${SPEC}:1:1: ${COMMENT_MESSAGES.directive}`,
    ])
  })

  it("accepts the version tag after an action pinned to a commit", () => {
    const source = [
      "jobs:",
      "  check:",
      "    steps:",
      `      - uses: actions/checkout@${SHA} # v7.0.0`,
      `      - uses: github/codeql-action/init@${SHA} # v4`,
      "        with:",
      `          uses: oven-sh/setup-bun@${SHA}`,
    ].join("\n")

    expect(commentProblems(WORKFLOW, source)).toStrictEqual([])
  })

  it.each([
    ["a version tag on an action pinned to a tag", "steps:\n  - uses: actions/checkout@v7 # v7\n", "2:31"],
    ["a version tag on a short SHA", "steps:\n  - uses: actions/checkout@0123456 # v7\n", "2:36"],
    ["text in place of the version tag", `steps:\n  - uses: actions/checkout@${SHA} # pinned for speed\n`, "2:69"],
    ["a link on a YAML line", `steps:\n  - run: bun run check # https://saasyland.com/docs\n`, "2:24"],
    ["a comment on a line of its own", "# Runs on every pull request\non: pull_request\n", "1:1"],
  ])("reports %s in YAML", (_case, source, position) => {
    expect(commentProblems(WORKFLOW, source)).toStrictEqual([`${WORKFLOW}:${position}: ${YAML_COMMENT_MESSAGE}`])
  })
})

describe("sourceFiles", () => {
  const files = sourceFiles()

  it("reads the browser suite, the scripts, the configuration, the stylesheets and the workflows, which the linter does not all read", () => {
    expect(files).toStrictEqual(
      expect.arrayContaining([
        "e2e/global-setup.ts",
        SCRIPT,
        "vite.config.ts",
        "src/presentation/styles/globals.css",
        ".github/workflows/ci.yml",
      ]),
    )
  })

  it("leaves out the generated files that .gitattributes marks", () => {
    expect(files).not.toContain("src/routeTree.gen.ts")
    expect(files).not.toContain("src/types/worker-configuration.d.ts")
  })

  it("lists every kind of source and style file", () => {
    expect(SOURCE_PATTERNS).toStrictEqual(expect.arrayContaining(["*.css", "*.js", "*.mjs", "*.ts", "*.tsx", "*.yml"]))
  })

  it("runs before the linter in the check and in the pre-commit hook", () => {
    expect(scripts["check:comments"]).toBe(`bun ${SCRIPT}`)
    expect(scripts["check"]).toMatch(/^bun run generate:cn && bun run check:comments && /u)
    expect(scripts["check:pre-commit"]).toMatch(/^bun run generate:cn && bun run check:comments && /u)
  })
})
