import type { ESTree } from "vite/rolldown/utils"

import type { SourceModule } from "./module-bindings.ts"
import { TEST_KIND, type TestCall, type TestKind } from "./test-cases.ts"

export interface UnitScope {
  readonly callbacks: ReadonlyMap<ESTree.Node, TestCall>
  readonly guarded: ReadonlySet<ESTree.Node>
  readonly isDerived: (node: ESTree.Node) => boolean
  readonly module: Pick<SourceModule, "parents">
}

const STATEMENT = /(?:Declaration|Statement)$/u
const STATEMENT_LISTS: ReadonlySet<string> = new Set(["BlockStatement", "Program", "StaticBlock", "SwitchCase", "TSModuleBlock"])
export const FUNCTIONS: ReadonlySet<string> = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"])
const FUNCTION_VALUES: ReadonlySet<string> = new Set(["ArrowFunctionExpression", "ClassExpression", "FunctionExpression"])
const CASE_KINDS: ReadonlySet<TestKind> = new Set([TEST_KIND.CASE, TEST_KIND.STEP])
const SETUP_KINDS: ReadonlySet<TestKind> = new Set([TEST_KIND.GROUP, TEST_KIND.HOOK])
const LOOPS: ReadonlySet<string> = new Set(["DoWhileStatement", "ForInStatement", "ForOfStatement", "ForStatement", "WhileStatement"])

export const ancestorsOf = (parents: ReadonlyMap<ESTree.Node, ESTree.Node>, node: ESTree.Node): ESTree.Node[] => {
  const ancestors: ESTree.Node[] = []

  for (let parent = parents.get(node); parent !== undefined; parent = parents.get(parent)) {
    ancestors.push(parent)
  }

  return ancestors
}

const arrayElement = (scope: UnitScope, child: ESTree.Node, [parent, ...rest]: readonly ESTree.Node[]): ESTree.Node[] => {
  if (parent === undefined) {
    return []
  }

  return parent.type === "ArrayExpression" && !scope.guarded.has(parent) ? [child] : arrayElement(scope, parent, rest)
}

const isItem = (child: ESTree.Node, parent: ESTree.Node): boolean => {
  if (parent.type === "ObjectExpression" || parent.type === "TSInterfaceBody" || parent.type === "TSTypeLiteral") {
    return true
  }

  if (parent.type === "JSXElement" || parent.type === "JSXFragment") {
    return parent.children.some((item) => item === child)
  }

  return parent.type === "ExportNamedDeclaration" && child.type === "ExportSpecifier"
}

const nearestItem = (child: ESTree.Node, [parent, ...rest]: readonly ESTree.Node[]): ESTree.Node[] => {
  if (parent === undefined || STATEMENT.test(child.type)) {
    return []
  }

  return isItem(child, parent) ? [child] : nearestItem(parent, rest)
}

const valueOf = (node: ESTree.Node): ESTree.Node => {
  if (
    node.type === "ParenthesizedExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression"
  ) {
    return valueOf(node.expression)
  }

  return node
}

const declaresValue = (scope: UnitScope, { init }: ESTree.VariableDeclarator): boolean =>
  init === null || (!FUNCTION_VALUES.has(valueOf(init).type) && scope.isDerived(init))

export const isRemovableDeclarator = (scope: UnitScope, declarator: ESTree.VariableDeclarator): boolean => {
  const [, parent] = ancestorsOf(scope.module.parents, declarator)

  return parent !== undefined && STATEMENT_LISTS.has(parent.type) && !scope.guarded.has(parent) && declaresValue(scope, declarator)
}

const isSetup = (scope: UnitScope, ancestors: readonly ESTree.Node[]): boolean => {
  const owner = ancestors.find((ancestor) => FUNCTIONS.has(ancestor.type))

  return owner === undefined || scope.callbacks.has(owner)
}

const statementUnit = (scope: UnitScope, node: ESTree.Node, ancestors: readonly ESTree.Node[]): ESTree.Node[] => {
  const path = [node, ...ancestors]
  const index = path.findIndex((step) => STATEMENT.test(step.type))
  const statement = path[index]
  const parent = path[index + 1]
  const child = path[index - 1]

  if (statement === undefined || parent === undefined || !STATEMENT_LISTS.has(parent.type) || scope.guarded.has(parent)) {
    return []
  }

  if (statement.type === "ExpressionStatement") {
    return isSetup(scope, path.slice(index + 1)) || scope.isDerived(statement) ? [statement] : []
  }

  return child?.type === "VariableDeclarator" && isRemovableDeclarator(scope, child) ? [child] : []
}

const enclosingTest = (scope: UnitScope, path: readonly ESTree.Node[], kinds: ReadonlySet<TestKind>): TestCall[] =>
  path
    .flatMap((node) => scope.callbacks.get(node) ?? [])
    .filter(({ kind }) => kinds.has(kind))
    .slice(0, 1)

export const unitOf = (scope: UnitScope, node: ESTree.Node): ESTree.Node[] => {
  const ancestors = ancestorsOf(scope.module.parents, node)
  const [testCase] = enclosingTest(scope, [node, ...ancestors], CASE_KINDS)

  if (testCase !== undefined) {
    return callUnit(scope, testCase)
  }

  const setups = enclosingTest(scope, [node, ...ancestors], SETUP_KINDS).flatMap((setup) => callUnit(scope, setup))

  return [...arrayElement(scope, node, ancestors), ...nearestItem(node, ancestors), ...statementUnit(scope, node, ancestors), ...setups]
}

export const callUnit = (scope: UnitScope, { call }: TestCall): ESTree.Node[] => [
  ...statementUnit(scope, call, ancestorsOf(scope.module.parents, call)),
  ...unitOf(scope, call),
]

export const emptiedUnit = (scope: UnitScope, owner: ESTree.Node): ESTree.Node[] => {
  const parent = scope.module.parents.get(owner)
  const loops = LOOPS.has(owner.type) && parent !== undefined && STATEMENT_LISTS.has(parent.type) ? [owner] : []

  return [...loops, ...unitOf(scope, owner)]
}
