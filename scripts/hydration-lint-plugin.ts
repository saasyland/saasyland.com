import { type ESTree, definePlugin, defineRule } from "vite-plus/lint/plugins"

const DEFERRED_CALLS = new Set([
  "addEventListener",
  "requestAnimationFrame",
  "setInterval",
  "setTimeout",
  "useCallback",
  "useEffect",
  "useLayoutEffect",
])

const DEFERRED_PROPERTIES = new Set(["mutationFn", "queryFn"])

const HANDLER_NAME = /^on[A-Z]/u

const LOCALE_FORMATTERS = new Set(["toLocaleDateString", "toLocaleString", "toLocaleTimeString"])

const FUNCTION_TYPES = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"])

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function

const isFunction = (node: ESTree.Node): node is FunctionNode => FUNCTION_TYPES.has(node.type)

const nameOf = (node: ESTree.Node | null): string | undefined => {
  if (node?.type === "Identifier" || node?.type === "JSXIdentifier") {
    return node.name
  }
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value
  }
  if (node?.type === "MemberExpression" && !node.computed) {
    return nameOf(node.property)
  }
  return undefined
}

const isHandler = (name: string | undefined): boolean => name !== undefined && HANDLER_NAME.test(name)

const isDeferred = (fn: FunctionNode): boolean => {
  const { parent } = fn
  if (parent.type === "CallExpression") {
    return parent.arguments.some((argument) => argument === fn) && DEFERRED_CALLS.has(nameOf(parent.callee) ?? "")
  }
  if (parent.type === "JSXExpressionContainer") {
    return parent.parent.type === "JSXAttribute" && isHandler(nameOf(parent.parent.name))
  }
  if (parent.type === "Property") {
    const name = nameOf(parent.key)
    return isHandler(name) || DEFERRED_PROPERTIES.has(name ?? "")
  }
  if (parent.type === "VariableDeclarator") {
    return isHandler(nameOf(parent.id))
  }
  return false
}

const runsDuringRender = (node: ESTree.Node): boolean => {
  for (let ancestor: ESTree.Node | null = node; ancestor !== null; ancestor = ancestor.parent) {
    if (isFunction(ancestor) && isDeferred(ancestor)) {
      return false
    }
  }
  return true
}

export const noClockOrLocaleInRender = defineRule({
  create: (context) => ({
    CallExpression: (node) => {
      if (node.callee.type === "MemberExpression" && LOCALE_FORMATTERS.has(nameOf(node.callee) ?? "") && runsDuringRender(node)) {
        context.report({ messageId: "locale", node })
      }
    },
    MemberExpression: (node) => {
      if (nameOf(node.object) === "Date" && nameOf(node) === "now" && runsDuringRender(node)) {
        context.report({ messageId: "clock", node })
      }
    },
    NewExpression: (node) => {
      if (nameOf(node.callee) === "Date" && node.arguments.length === 0 && runsDuringRender(node)) {
        context.report({ messageId: "clock", node })
      }
    },
  }),
  meta: {
    docs: {
      description: "Rendering must not read the clock or format in the runtime's locale, which differ between the server and the browser.",
    },
    messages: {
      clock:
        "Rendering reads the clock, which the server and the browser read at different moments. Use an instant both share, such as a query's dataUpdatedAt or a build-time value, or read the clock in an event handler, an effect or a query function.",
      locale:
        "toLocale*String formats in the runtime's locale and time zone, which differ between the server and the browser. Format with useFormatter from use-intl.",
    },
    type: "problem",
  },
})

export default definePlugin({
  meta: { name: "hydration" },
  rules: { "no-clock-or-locale-in-render": noClockOrLocaleInRender },
})
