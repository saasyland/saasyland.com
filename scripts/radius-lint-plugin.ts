import { type Context, type ESTree, type Visitor, definePlugin, defineRule } from "vite-plus/lint/plugins"

import { nameOf } from "./hydration-lint-plugin.ts"

const SCALE = new Set(["full", "lg", "md", "none", "sm", "[inherit]"])

const RADIUS_UTILITY = /^rounded(?:-(?:ss|se|ee|es|tl|tr|br|bl|s|e|t|r|b|l))?(?:-(?<step>.*))?$/u

const ARBITRARY_PROPERTY = /^\[(?<property>[\w-]+):(?<value>.+)\]$/u

const RADIUS_PROPERTY = /^border(?:-[a-z]+)*-radius$/u

const CUSTOM_RADIUS_PROPERTY = /^--[\w-]*radius$/u

const SCALE_VARIABLE = /^var\(--radius(?:-(?:sm|md|lg))?\)$/u

const IMPORTANT = /^!|!$/gu

const STYLE_KEY = "borderRadius"

const OPENERS = new Set(["(", "["])

const CLOSERS = new Set([")", "]"])

const utilityOf = (token: string): string => {
  let depth = 0
  let start = 0
  for (let index = 0; index < token.length; index += 1) {
    const character = token.charAt(index)
    if (OPENERS.has(character)) {
      depth += 1
    } else if (CLOSERS.has(character)) {
      depth -= 1
    } else if (character === ":" && depth === 0) {
      start = index + 1
    }
  }
  return token.slice(start).replaceAll(IMPORTANT, "")
}

export const utilitiesOf = (text: string): string[] => text.split(/\s+/u).map((token) => utilityOf(token))

export const classTextVisitor = (check: (node: ESTree.Node, utilities: readonly string[]) => void): Visitor => ({
  Literal: (node) => {
    if (typeof node.value === "string") {
      check(node, utilitiesOf(node.value))
    }
  },
  TemplateElement: (node) => {
    check(node, utilitiesOf(node.value.cooked ?? node.value.raw))
  },
})

export const styleKeyVisitor = (context: Context, key: string): Visitor => ({
  Property: (node) => {
    if (node.parent.type === "ObjectExpression" && nameOf(node.key) === key) {
      context.report({ messageId: "style", node: node.key })
    }
  },
})

const arbitraryProperty = (utility: string): { property: string; value: string } => {
  const { property = "", value = "" } = ARBITRARY_PROPERTY.exec(utility)?.groups ?? {}
  return { property, value }
}

const isOffScaleStep = (utility: string): boolean => {
  const match = RADIUS_UTILITY.exec(utility)
  return match !== null && !SCALE.has(match.groups?.["step"] ?? "")
}

const isRadiusProperty = (utility: string): boolean => RADIUS_PROPERTY.test(arbitraryProperty(utility).property)

const isOffScaleCustomRadius = (utility: string): boolean => {
  const { property, value } = arbitraryProperty(utility)
  return CUSTOM_RADIUS_PROPERTY.test(property) && !SCALE_VARIABLE.test(value)
}

const RADIUS_PROBLEMS = [
  { isProblem: isOffScaleStep, messageId: "step" },
  { isProblem: isRadiusProperty, messageId: "property" },
  { isProblem: isOffScaleCustomRadius, messageId: "custom" },
] as const

export const noOffScale = defineRule({
  create: (context) => ({
    ...classTextVisitor((node, utilities) => {
      for (const utility of utilities) {
        const problem = RADIUS_PROBLEMS.find(({ isProblem }) => isProblem(utility))
        if (problem !== undefined) {
          context.report({ data: { utility }, messageId: problem.messageId, node })
        }
      }
    }),
    ...styleKeyVisitor(context, STYLE_KEY),
  }),
  meta: {
    docs: {
      description:
        "Corners take their radius from the scale in globals.css: rounded-sm, rounded-md, rounded-lg, rounded-full or rounded-none.",
    },
    messages: {
      custom: "{{utility}} gives a component a radius outside the scale. Set it to var(--radius-sm), var(--radius-md) or var(--radius-lg).",
      property: "{{utility}} sets a corner radius outside the scale. Use a rounded-* class from the scale.",
      step: "{{utility}} is not on the radius scale. Use rounded-sm (4px) for inner elements, rounded-md (6px) for controls, rounded-lg (8px) for surfaces, rounded-full for circles and pills, or rounded-none.",
      style: "A radius in a style object bypasses the scale. Use a rounded-* class from the scale.",
    },
    type: "problem",
  },
})

export default definePlugin({
  meta: { name: "radius" },
  rules: { "no-off-scale": noOffScale },
})
