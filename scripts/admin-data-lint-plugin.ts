import { type ESTree, definePlugin, defineRule } from "vite-plus/lint/plugins"

import { nameOf } from "./hydration-lint-plugin.ts"

const MIN_LIST_LENGTH = 2

const SORT_POSITION_KEY = "order"

const QUERY_HOOKS = new Set(["useQuery", "useSuspenseQuery"])

const STATISTIC_KEY = "useValue"

const DEMO_NAME = /demo|dummy|fake|lorem|mock|sample/iu

const PLACEHOLDER_CONSTANT = /^[\dA-Z_]*PLACEHOLDER[\dA-Z_]*$/u

const EMAIL_ADDRESS = /[^\s@]+@[^\s@]+\.[a-z]{2,}/iu

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/u

const SVG_PATH = /^\s*m\s*-?[\d.]+[\s,]+-?[\d.]+/iu

const isNumber = (node: ESTree.Node | null): boolean =>
  (node?.type === "Literal" && typeof node.value === "number") ||
  (node?.type === "UnaryExpression" && node.operator === "-" && isNumber(node.argument))

const carriesNumber = (node: ESTree.Node | null): boolean =>
  node?.type === "ObjectExpression" &&
  node.properties.some((property) => property.type === "Property" && nameOf(property.key) !== SORT_POSITION_KEY && isNumber(property.value))

const isStatistic = (node: ESTree.Node): boolean => node.type === "Property" && nameOf(node.key) === STATISTIC_KEY

const STRING_PROBLEMS = [
  { messageId: "contact", pattern: EMAIL_ADDRESS },
  { messageId: "date", pattern: ISO_DATE },
  { messageId: "path", pattern: SVG_PATH },
] as const

export const noLiteralData = defineRule({
  create: (context) => {
    const queriedStatistics = new Set<ESTree.Node>()

    return {
      ArrayExpression: (node) => {
        if (node.elements.filter((element) => isNumber(element)).length >= MIN_LIST_LENGTH) {
          context.report({ messageId: "series", node })
        } else if (node.elements.filter((element) => carriesNumber(element)).length >= MIN_LIST_LENGTH) {
          context.report({ messageId: "records", node })
        }
      },
      CallExpression: (node) => {
        if (node.callee.type === "Identifier" && QUERY_HOOKS.has(node.callee.name)) {
          for (let ancestor: ESTree.Node | null = node.parent; ancestor !== null; ancestor = ancestor.parent) {
            if (isStatistic(ancestor)) {
              queriedStatistics.add(ancestor)
            }
          }
        }
      },
      Literal: (node) => {
        const { value } = node
        if (typeof value !== "string") {
          return
        }
        const problem = STRING_PROBLEMS.find(({ pattern }) => pattern.test(value))
        if (problem !== undefined) {
          context.report({ messageId: problem.messageId, node })
        }
      },
      "Property:exit": (node) => {
        if (isStatistic(node) && !queriedStatistics.has(node)) {
          context.report({ messageId: "statistic", node })
        }
      },
      VariableDeclarator: (node) => {
        if (node.id.type === "Identifier" && (DEMO_NAME.test(node.id.name) || PLACEHOLDER_CONSTANT.test(node.id.name))) {
          context.report({ messageId: "name", node: node.id })
        }
      },
    }
  },
  meta: {
    docs: {
      description: "Admin screens show what the database holds, so their code declares no data of its own.",
    },
    messages: {
      contact: "An e-mail address in admin code is data. Read the people an admin screen lists from a query.",
      date: "A date in admin code is data. Read dates from a query, or let the server compute the period.",
      name: "A demo, sample or placeholder constant in admin code stands in for data. Read the real value from a query, or remove the screen until a real source exists.",
      path: "An SVG path drawn from numbers is a hardcoded chart. Draw charts from a query's series.",
      records: "A list of records carrying numbers is data. Read the rows from a query.",
      series: "A list of numbers is a hardcoded series. Read the series from a query.",
      statistic: "A dashboard statistic must read its value from a query with useSuspenseQuery or useQuery.",
    },
    type: "problem",
  },
})

export default definePlugin({
  meta: { name: "admin-data" },
  rules: { "no-literal-data": noLiteralData },
})
