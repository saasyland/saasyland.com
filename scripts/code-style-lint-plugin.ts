import { type ESTree, definePlugin, defineRule } from "vite-plus/lint/plugins"

const SHEBANG = "Shebang"

const DIRECTIVE = /^[\s*]*(?:@ts-(?:expect-error|ignore|nocheck)|(?:eslint|oxlint)-disable)/u

export const COMMENT_MESSAGES = {
  comment:
    "Remove this comment. Say it in a name, a named constant or a smaller function, and put the reasoning in the commit message, the pull request or the docs.",
  directive: "Remove this directive comment, which switches a check off, and fix the cause the rule or the compiler reports instead.",
} as const

export const commentMessageId = (text: string): keyof typeof COMMENT_MESSAGES => (DIRECTIVE.test(text) ? "directive" : "comment")

export const noComments = defineRule({
  create: (context) => ({
    Program: () => {
      for (const comment of context.sourceCode.getAllComments()) {
        if (comment.type !== SHEBANG) {
          context.report({ loc: comment.loc, messageId: commentMessageId(comment.value) })
        }
      }
    },
  }),
  meta: {
    docs: {
      description: "Source files carry no comments: names, the commit message, the pull request and the docs carry the meaning.",
    },
    messages: COMMENT_MESSAGES,
    type: "problem",
  },
})

const spansLines = (node: ESTree.Node): boolean => node.loc.start.line !== node.loc.end.line

export const noMultilineTernary = defineRule({
  create: (context) => ({
    ConditionalExpression: (node) => {
      if (spansLines(node)) {
        context.report({ messageId: "multiline", node })
      }
    },
  }),
  meta: {
    docs: {
      description: "A ternary fits on one line; longer choices are early returns, a pair of && conditions or a small component.",
    },
    messages: {
      multiline:
        'A ternary that spans lines. Keep it on one line, or choose with an early return, a pair of && conditions or a small component; conditional classes use cn("base", { classes: condition }).',
    },
    type: "problem",
  },
})

const isUndefined = (node: ESTree.Node | null): boolean => node?.type === "Identifier" && node.name === "undefined"

const isNull = (node: ESTree.Node): boolean => node.type === "Literal" && node.raw === "null"

const isAbsent = (node: ESTree.Node): boolean => isUndefined(node) || isNull(node)

export const noUndefinedFallback = defineRule({
  create: (context) => ({
    LogicalExpression: (node) => {
      if (node.operator === "??" && isUndefined(node.right)) {
        context.report({ messageId: "fallback", node })
      }
    },
  }),
  meta: {
    docs: {
      description: "Nothing turns null into undefined with ?? undefined; the value is validated or parsed instead.",
    },
    messages: {
      fallback:
        "`?? undefined` turns null into undefined by hand. Validate the value with the module's Zod schema first, or read it with a parser that returns undefined, such as searchParam in src/lib/search-params.ts.",
    },
    type: "problem",
  },
})

export const noUndefinedBranch = defineRule({
  create: (context) => ({
    ConditionalExpression: (node) => {
      if (isAbsent(node.consequent) || isAbsent(node.alternate)) {
        context.report({ messageId: "ternary", node })
      }
    },
    ReturnStatement: (node) => {
      if (isUndefined(node.argument)) {
        context.report({ messageId: "return", node })
      }
    },
  }),
  meta: {
    docs: {
      description: "No ternary chooses undefined or null and no function spells out return undefined; the code says what it does instead.",
    },
    messages: {
      return:
        "`return undefined` spells out the default. Return the expression that is already undefined when nothing matches, such as find, a lookup or a Zod parse's data, or end a function that returns nothing with a bare return.",
      ternary:
        "A ternary with an undefined or null branch. Return early from a guard clause, use optional chaining or ?? with a real default, look the value up in a map or with find, render with && in JSX, or give a Vite plugin hook a filter.",
    },
    type: "problem",
  },
})

const ZOD = "zod"

const ZOD_SOURCE = /^zod(?:\/|$)/u

const isZodNamespace = (node: ESTree.ImportDeclaration): boolean => {
  const [specifier, ...others] = node.specifiers

  return node.source.value === ZOD && others.length === 0 && specifier?.type === "ImportNamespaceSpecifier" && specifier.local.name === ZOD
}

export const zodNamespaceImport = defineRule({
  create: (context) => ({
    ImportDeclaration: (node) => {
      if (ZOD_SOURCE.test(node.source.value) && !isZodNamespace(node)) {
        context.report({ messageId: "import", node })
      }
    },
  }),
  meta: {
    docs: {
      description: "Zod is imported one way, as the namespace zod from the package root, the form Zod 4's documentation shows.",
    },
    messages: {
      import:
        'Import Zod as `import * as zod from "zod"`, or `import type * as zod from "zod"` for types only, and read every export through `zod.`.',
    },
    type: "problem",
  },
})

export default definePlugin({
  meta: { name: "code-style" },
  rules: {
    "no-comments": noComments,
    "no-multiline-ternary": noMultilineTernary,
    "no-undefined-branch": noUndefinedBranch,
    "no-undefined-fallback": noUndefinedFallback,
    "zod-namespace-import": zodNamespaceImport,
  },
})
