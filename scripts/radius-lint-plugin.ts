import { type ESTree, definePlugin, defineRule } from "vite-plus/lint/plugins"

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

export const utilityOf = (token: string): string => {
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

const propertyProblem = (utility: string): string | undefined => {
  const { property = "", value = "" } = ARBITRARY_PROPERTY.exec(utility)?.groups ?? {}
  if (RADIUS_PROPERTY.test(property)) {
    return "property"
  }
  return CUSTOM_RADIUS_PROPERTY.test(property) && !SCALE_VARIABLE.test(value) ? "custom" : undefined
}

const radiusProblem = (utility: string): string | undefined => {
  const match = RADIUS_UTILITY.exec(utility)
  if (match === null) {
    return propertyProblem(utility)
  }
  return SCALE.has(match.groups?.["step"] ?? "") ? undefined : "step"
}

const keyName = (node: ESTree.Node): string | undefined => {
  if (node.type === "Identifier") {
    return node.name
  }
  return node.type === "Literal" ? String(node.value) : undefined
}

export const noOffScale = defineRule({
  create: (context) => {
    const check = (node: ESTree.Node, text: string): void => {
      for (const token of text.split(/\s+/u)) {
        const utility = utilityOf(token)
        const messageId = radiusProblem(utility)
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
