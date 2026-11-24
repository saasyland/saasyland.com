import type { ESTree } from "vite/rolldown/utils"

import { BINDING_KIND, type SourceModule } from "./module-bindings.ts"

export const TEST_KIND = { CASE: "case", GROUP: "group", HOOK: "hook", STEP: "step" } as const

export type TestKind = (typeof TEST_KIND)[keyof typeof TEST_KIND]

export type Callback = ESTree.ArrowFunctionExpression | (ESTree.Function & { readonly body: ESTree.FunctionBody })

export interface TestCall {
  readonly call: ESTree.CallExpression
  readonly callbacks: readonly Callback[]
  readonly kind: TestKind
  readonly tables: readonly ESTree.Node[]
}

export interface ModuleMock {
  readonly call: ESTree.CallExpression
  readonly source: string
  readonly specifier: ESTree.Node
}

interface Chain {
  readonly kind: TestKind
  readonly member: string
  readonly node: ESTree.Node
  readonly tables: readonly ESTree.Node[]
}

type Parents = SourceModule["parents"]

const HOOK_KINDS = ["afterAll", "afterEach", "beforeAll", "beforeEach"].map((hook): [string, TestKind] => [hook, TEST_KIND.HOOK])
const GROUP_KIND: [string, TestKind] = ["describe", TEST_KIND.GROUP]
const TEST_FUNCTIONS: ReadonlyMap<string, TestKind> = new Map([...HOOK_KINDS, GROUP_KIND, ["it", TEST_KIND.CASE], ["test", TEST_KIND.CASE]])
const TEST_MEMBERS: ReadonlyMap<string, TestKind> = new Map([...HOOK_KINDS, GROUP_KIND, ["step", TEST_KIND.STEP]])
const TABLE_MEMBERS: ReadonlySet<string> = new Set(["each", "for"])
const MOCKER = "vi"
const MOCK_MEMBERS: ReadonlySet<string> = new Set(["doMock", "doUnmock", "mock", "unmock"])
const TEST_FILE = /\.(?:spec|test)\.[cm]?[jt]sx?$/u

export const isTestFile = (file: string): boolean => TEST_FILE.test(file)

const memberOf = (parent: ESTree.Node | undefined, object: ESTree.Node): string[] => {
  if (parent?.type !== "MemberExpression" || parent.object !== object || parent.computed) {
    return []
  }

  return parent.property.type === "Identifier" ? [parent.property.name] : []
}

const isCallback = (node: ESTree.Node): node is Callback => node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression"

const isCalled = (call: ESTree.Node | undefined, callee: ESTree.Node): call is ESTree.CallExpression =>
  call?.type === "CallExpression" && call.callee === callee

const testCallOf = (call: ESTree.CallExpression, { kind, tables }: Chain): TestCall[] => {
  const callbacks = call.arguments.filter((argument) => isCallback(argument))
  const [first] = call.arguments
  const titled = kind === TEST_KIND.HOOK || (first !== undefined && !isCallback(first))

  return callbacks.length > 0 && titled ? [{ call, callbacks, kind, tables }] : []
}

const followChain = (parents: Parents, chain: Chain): TestCall[] => {
  const parent = parents.get(chain.node)
  const [member] = memberOf(parent, chain.node)

  if (parent !== undefined && member !== undefined) {
    return followChain(parents, { ...chain, kind: TEST_MEMBERS.get(member) ?? chain.kind, member, node: parent })
  }

  if (!isCalled(parent, chain.node)) {
    return []
  }

  if (isCalled(parents.get(parent), parent)) {
    return followChain(parents, { ...chain, node: parent, tables: TABLE_MEMBERS.has(chain.member) ? parent.arguments : chain.tables })
  }

  return testCallOf(parent, chain)
}

const importsOf = ({ bindings }: SourceModule, name: string): ESTree.Node[] =>
  bindings.flatMap((binding) => (binding.kind === BINDING_KIND.IMPORT && binding.path.includes(name) ? binding.references : []))

export const testCallsOf = (module: SourceModule): TestCall[] =>
  [...TEST_FUNCTIONS].flatMap(([name, kind]) =>
    importsOf(module, name).flatMap((node) => followChain(module.parents, { kind, member: "", node, tables: [] })),
  )

const mockOf = (call: ESTree.CallExpression): ModuleMock[] => {
  const [specifier] = call.arguments

  if (specifier?.type === "Literal" && typeof specifier.value === "string") {
    return [{ call, source: specifier.value, specifier }]
  }

  if (specifier?.type !== "ImportExpression" || specifier.source.type !== "Literal") {
    return []
  }

  return [{ call, source: String(specifier.source.value), specifier }]
}

const mockCallOf = (parents: Parents, reference: ESTree.Node): ModuleMock[] => {
  const member = parents.get(reference)
  const isMock = memberOf(member, reference).some((name) => MOCK_MEMBERS.has(name))

  if (!isMock || member === undefined) {
    return []
  }

  const call = parents.get(member)

  return isCalled(call, member) ? mockOf(call) : []
}

export const moduleMocksOf = (module: SourceModule): ModuleMock[] =>
  importsOf(module, MOCKER).flatMap((reference) => mockCallOf(module.parents, reference))
