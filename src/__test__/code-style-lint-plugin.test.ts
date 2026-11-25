import { RuleTester } from "vite-plus/lint/plugins-dev"

import {
  noComments,
  noMultilineTernary,
  noUndefinedBranch,
  noUndefinedFallback,
  zodNamespaceImport,
} from "~/scripts/code-style-lint-plugin"

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } })

const comment = { messageId: "comment" }
const directive = { messageId: "directive" }
const multiline = { messageId: "multiline" }
const fallback = { messageId: "fallback" }
const ternary = { messageId: "ternary" }
const returned = { messageId: "return" }
const zodImport = { messageId: "import" }

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
    {
      code: "// https://github.com/TanStack/router/issues/8933\n// The router drops the hash\nconst first = 1",
      errors: [comment, comment],
    },
    { code: "// https://saasyland.com/docs\n// https://saasyland.com/roadmap\nconst first = 1", errors: [comment, comment] },
    { code: "/*\n * https://saasyland.com/docs\n */\nconst first = 1", errors: [comment] },
    { code: "// The router drops the hash when it redirects, read https://saasyland.com/docs\nconst first = 1", errors: [comment] },
    { code: "// https://saasyland.com/docs explains why\nconst first = 1", errors: [comment] },
    { code: "// http://saasyland.com/docs\nconst first = 1", errors: [comment] },
    { code: "// /blog/ai-coding-agent-guardrails\nconst first = 1", errors: [comment] },
    { code: "// TODO: https://github.com/saasyland/saasyland.com/issues/1\nconst first = 1", errors: [comment] },
    { code: "// oxlint-disable-next-line https://saasyland.com/docs\nconst first = 2", errors: [directive] },
  ],
  valid: [
    "#!/usr/bin/env bun\nconst first = 1",
    "#!/usr/bin/env bun\n// https://github.com/TanStack/router/issues/8933\nconst first = 1",
    "// See /docs/conventions/code-style#comments\nconst first = 1",
    "const first = 1 /* Upstream bug: https://github.com/oxc-project/oxc/issues/1 */",
    "const Link = () => <a>{/* https://saasyland.com/docs/conventions */}</a>",
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

tester.run("no-undefined-branch", noUndefinedBranch, {
  invalid: [
    { code: "const load = (id) => (id === MODULE_ID ? source : undefined)", errors: [ternary] },
    { code: "const label = isEmpty ? undefined : text", errors: [ternary] },
    { code: "const Panel = ({ isOpen }) => <div>{isOpen ? <Close /> : null}</div>", errors: [ternary] },
    { code: "const owner = isShared ? null : user", errors: [ternary] },
    { code: "const size = isLarge ? 2 : isMedium ? 1 : undefined", errors: [ternary] },
    { code: "const pick = (value) => {\n  if (value === '') {\n    return undefined\n  }\n\n  return value\n}", errors: [returned] },
    { code: "function nothing() {\n  return undefined\n}", errors: [returned] },
  ],
  valid: [
    "const label = isOpen ? 'close' : 'open'",
    "const load = { filter: { id: MODULE_ID }, handler: () => source }",
    "const Panel = ({ isOpen }) => <div>{isOpen && <Close />}</div>",
    "const name = user?.name ?? 'guest'",
    "const isMissing = value === undefined ? 'missing' : 'present'",
    "const pick = (values) => values.find((value) => value.length > 0)",
    "const stop = (event) => {\n  if (event.defaultPrevented) {\n    return\n  }\n\n  event.preventDefault()\n}",
    "const read = (value) => {\n  return value\n}",
    "const pattern = isStrict ? /^null$/u : /null/u",
    "type Maybe<T> = T extends string ? T : undefined",
  ],
})

tester.run("zod-namespace-import", zodNamespaceImport, {
  invalid: [
    { code: 'import zod from "zod/v4"', errors: [zodImport] },
    { code: 'import * as zod from "zod/v4"', errors: [zodImport] },
    { code: 'import zod from "zod"', errors: [zodImport] },
    { code: 'import { z } from "zod"', errors: [zodImport] },
    { code: 'import { ZodError } from "zod"', errors: [zodImport] },
    { code: 'import * as z from "zod"', errors: [zodImport] },
    { code: 'import type { ZodType } from "zod"', errors: [zodImport] },
    { code: 'import { z } from "zod/mini"', errors: [zodImport] },
  ],
  valid: [
    'import * as zod from "zod"',
    'import type * as zod from "zod"',
    'import { zodResolver } from "zod-form-adapter"',
    'import { createServerFn } from "@tanstack/react-start"',
  ],
})
