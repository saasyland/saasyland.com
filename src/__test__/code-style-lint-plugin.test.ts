import { RuleTester } from "vite-plus/lint/plugins-dev"

import { noComments, noMultilineTernary, noUndefinedFallback } from "~/scripts/code-style-lint-plugin"

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } })

const comment = { messageId: "comment" }
const directive = { messageId: "directive" }
const multiline = { messageId: "multiline" }
const fallback = { messageId: "fallback" }

tester.run("no-comments", noComments, {
  invalid: [
    { code: "// a comment that starts in lower case\nconst first = 1", errors: [comment] },
    { code: "// A capitalised comment on its own line\nconst first = 1", errors: [comment] },
    { code: "const first = 1 // A comment after code", errors: [comment] },
    { code: "/** A JSDoc block */\nconst first = 1", errors: [comment] },
    { code: "/* A block comment */ const first = 1", errors: [comment] },
    { code: "const Panel = () => <div>{/* A comment in JSX */}</div>", errors: [comment] },
    { code: "// TODO fix this later\nconst first = 1", errors: [comment] },
    { code: '/// <reference types="vite/client" />\nconst first = 1', errors: [comment] },
    { code: "// @ts-expect-error A described expectation\nconst first: string = 1", errors: [directive] },
    { code: "// @ts-ignore\nconst first: string = 1", errors: [directive] },
    { code: "// @ts-nocheck\nconst first = 1", errors: [directive] },
    { code: "/** @ts-ignore */\nconst first: string = 1", errors: [directive] },
    { code: "// oxlint-disable-next-line no-magic-numbers\nconst first = 2", errors: [directive] },
    { code: "// eslint-disable-next-line no-magic-numbers\nconst first = 2", errors: [directive] },
    { code: "const first = 1\n// A first comment\n/* A second comment */", errors: [comment, comment] },
  ],
  valid: [
    "#!/usr/bin/env bun\nconst first = 1",
    "const url = 'https://saasyland.com/docs'",
    String.raw`const pattern = /^\/\/ /u`,
    "const glob = 'src/**/*.ts'",
    "const template = `// a template /* that is not a comment */`",
    "const Link = () => <a href='https://saasyland.com'>https://saasyland.com // not a comment</a>",
  ],
})

tester.run("no-multiline-ternary", noMultilineTernary, {
  invalid: [
    { code: "const label = isOpen\n  ? 'close'\n  : 'open'", errors: [multiline] },
    { code: "const Panel = ({ isOpen }) => <div>{isOpen ? (\n  <Close />\n) : (\n  <Open />\n)}</div>", errors: [multiline] },
    { code: "const Panel = ({ isOpen }) => <div>{isOpen ? (\n  <Close />\n) : undefined}</div>", errors: [multiline] },
    { code: "const classes = cn('base', isOpen\n  ? 'block'\n  : 'hidden')", errors: [multiline] },
    { code: "const text = (node) => isLiteral(node) ? node.value : children(node)\n  .map(textOf)\n  .join(' ')", errors: [multiline] },
    { code: "const size = isLarge ? 2 : isMedium\n  ? 1\n  : 0", errors: [multiline, multiline] },
  ],
  valid: [
    "const label = isOpen ? 'close' : 'open'",
    "const Save = ({ course }) => <button>{t(course === undefined ? 'create' : 'save')}</button>",
    "const classes = cn('base', { block: isOpen, hidden: !isOpen })",
    "const Panel = ({ isOpen }) => <div>{isOpen && (\n  <Close />\n)}</div>",
    "const pick = (value) => {\n  if (value === undefined) {\n    return 'none'\n  }\n\n  return value\n}",
  ],
})

tester.run("no-undefined-fallback", noUndefinedFallback, {
  invalid: [
    { code: "const redirect = params.get('redirect') ?? undefined", errors: [fallback] },
    { code: "const user = { name: row.name ?? undefined }", errors: [fallback] },
    { code: "save(session?.user ?? undefined)", errors: [fallback] },
  ],
  valid: [
    "const redirect = searchParam(callbackPathSchema)",
    "const count = row.count ?? 0",
    "const name = row.name ?? defaultName",
    "const label = row.label ?? 'none'",
  ],
})
