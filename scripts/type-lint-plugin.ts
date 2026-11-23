import { definePlugin, defineRule } from "vite-plus/lint/plugins"

import { classTextVisitor, styleKeyVisitor } from "./radius-lint-plugin.ts"

const BELOW_FLOOR = new Set(["text-xs", "text-2xs"])

const ARBITRARY_SIZE = /^text-(?:\[(?:length:|\.?\d|calc\(|clamp\(|min\(|max\()|\(length:)/u

const SIZE_PROPERTY = "[font-size:"

const STYLE_KEY = "fontSize"

const MONO = "font-mono"

const NOT_CODE = new Set(["tabular-nums", "text-label", "uppercase"])

const SIZE_PROBLEMS = [
  { isProblem: (utility: string) => BELOW_FLOOR.has(utility), messageId: "floor" },
  { isProblem: (utility: string) => utility.startsWith(SIZE_PROPERTY), messageId: "property" },
  { isProblem: (utility: string) => ARBITRARY_SIZE.test(utility), messageId: "arbitrary" },
] as const

export const noOffScale = defineRule({
  create: (context) => ({
    ...classTextVisitor((node, utilities) => {
      for (const utility of utilities) {
        const problem = SIZE_PROBLEMS.find(({ isProblem }) => isProblem(utility))
        if (problem !== undefined) {
          context.report({ data: { utility }, messageId: problem.messageId, node })
        }
      }
    }),
    ...styleKeyVisitor(context, STYLE_KEY),
  }),
  meta: {
    docs: {
      description: "Text takes its size from the type scale in globals.css, and nothing a reader must read is set below 12px.",
    },
    messages: {
      arbitrary:
        "{{utility}} sets a font size outside the type scale. Use a text-* token from globals.css, such as text-spec (13px) or text-body-sm (14px).",
      floor:
        "{{utility}} is below the type scale's floor. Use text-spec (13px) for small text, or text-label (12px, medium) for a short label, badge or table header.",
      property: "{{utility}} sets a font size outside the type scale. Use a text-* token from globals.css.",
      style: "A font size in a style object bypasses the type scale. Use a text-* token from globals.css.",
    },
    type: "problem",
  },
})

export const monoForCode = defineRule({
  create: (context) =>
    classTextVisitor((node, utilities) => {
      if (!utilities.includes(MONO)) {
        return
      }
      for (const utility of utilities.filter((candidate) => NOT_CODE.has(candidate))) {
        context.report({ data: { utility }, messageId: "label", node })
      }
    }),
  meta: {
    docs: {
      description: "Geist Mono is for code, commands, keys and identifiers; labels and figures are set in the sans.",
    },
    messages: {
      label:
        "font-mono with {{utility}} sets a label or a figure in the monospaced face. Keep font-mono for code, commands, keys and identifiers, and use the sans with tabular-nums for figures that must line up.",
    },
    type: "problem",
  },
})

export default definePlugin({
  meta: { name: "type" },
  rules: { "mono-for-code": monoForCode, "no-off-scale": noOffScale },
})
