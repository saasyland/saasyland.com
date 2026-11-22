import { type ESTree, definePlugin, defineRule } from "vite-plus/lint/plugins"

import { utilityOf } from "./radius-lint-plugin.ts"

const BELOW_FLOOR = new Set(["text-xs", "text-2xs"])

const ARBITRARY_SIZE = /^text-(?:\[(?:length:|\.?\d|calc\(|clamp\(|min\(|max\()|\(length:)/u

const SIZE_PROPERTY = "[font-size:"

const STYLE_KEY = "fontSize"

const MONO = "font-mono"

const NOT_CODE = new Set(["tabular-nums", "text-label", "uppercase"])

const keyName = (node: ESTree.Node): string | undefined => {
  if (node.type === "Identifier") {
    return node.name
  }
  return node.type === "Literal" ? String(node.value) : undefined
}

const sizeProblem = (utility: string): string | undefined => {
  if (BELOW_FLOOR.has(utility)) {
    return "floor"
  }
  if (utility.startsWith(SIZE_PROPERTY)) {
    return "property"
  }
  return ARBITRARY_SIZE.test(utility) ? "arbitrary" : undefined
}

const utilitiesOf = (text: string): string[] => text.split(/\s+/u).map((token) => utilityOf(token))

export const noOffScale = defineRule({
  create: (context) => {
    const check = (node: ESTree.Node, text: string): void => {
      for (const utility of utilitiesOf(text)) {
        const messageId = sizeProblem(utility)
        if (messageId !== undefined) {
          context.report({ data: { utility }, messageId, node })
        }
      }
    }

    return {
      Literal: (node) => {
        if (typeof node.value === "string") {
          check(node, node.value)
        }
      },
      Property: (node) => {
        if (node.parent.type === "ObjectExpression" && keyName(node.key) === STYLE_KEY) {
          context.report({ messageId: "style", node: node.key })
        }
      },
      TemplateElement: (node) => {
        check(node, node.value.cooked ?? node.value.raw)
      },
    }
  },
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
  create: (context) => {
    const check = (node: ESTree.Node, text: string): void => {
      const utilities = utilitiesOf(text)
      if (!utilities.includes(MONO)) {
        return
      }
      for (const utility of utilities.filter((candidate) => NOT_CODE.has(candidate))) {
        context.report({ data: { utility }, messageId: "label", node })
      }
    }

    return {
      Literal: (node) => {
        if (typeof node.value === "string") {
          check(node, node.value)
        }
      },
      TemplateElement: (node) => {
        check(node, node.value.cooked ?? node.value.raw)
      },
    }
  },
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
