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

const isUndefined = (node: ESTree.Node): boolean => node.type === "Identifier" && node.name === "undefined"

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

export default definePlugin({
  meta: { name: "code-style" },
  rules: {
    "no-comments": noComments,
    "no-multiline-ternary": noMultilineTernary,
    "no-undefined-fallback": noUndefinedFallback,
  },
})
