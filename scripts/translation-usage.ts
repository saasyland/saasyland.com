import type { ESTree } from "vite/rolldown/utils"

import {
  BINDING_KIND,
  type ModuleBinding,
  type SourceModule,
  analyzeModule,
  childNodes,
  nameOf,
  resolveSourceFile,
} from "./module-bindings.ts"

export const KEY_SEPARATOR = "."

export const TRANSLATOR_METHOD = { CALL: "call", HAS: "has", MARKUP: "markup", RAW: "raw", RICH: "rich" } as const

export type TranslatorMethod = (typeof TRANSLATOR_METHOD)[keyof typeof TRANSLATOR_METHOD]

export interface KeyRead {
  readonly file: string
  readonly line: number
  readonly method: TranslatorMethod
  readonly parts: readonly string[]
}

export interface TranslationUsage {
  readonly declared: Set<string>
  readonly given: ReadonlyMap<string, ReadonlySet<string>>
  readonly own: ReadonlyMap<string, ReadonlySet<string>>
  readonly reads: readonly KeyRead[]
}

interface Target {
  readonly declaration?: ESTree.Node
  readonly path?: readonly string[]
  readonly source?: string
}

interface IndexedModule {
  readonly file: string
  readonly module: SourceModule
  readonly references: ReadonlyMap<ESTree.Node, readonly ESTree.Node[]>
  readonly source: string
  readonly targets: ReadonlyMap<ESTree.Node, Target>
}

interface Project {
  readonly files: ReadonlySet<string>
  readonly modules: Map<string, IndexedModule>
  readonly read: (file: string) => string
}

interface Located {
  readonly file: string
  readonly node: ESTree.Node
}

interface FactoryCall {
  readonly call: ESTree.CallExpression
  readonly factory: string
}

interface TranslatorCall {
  readonly call?: ESTree.CallExpression
  readonly method: TranslatorMethod
}

type Shape = readonly string[]

type ImportBinding = Extract<ModuleBinding, { readonly kind: typeof BINDING_KIND.IMPORT }>

const FACTORY = { CREATE: "createTranslator", USE: "useTranslations" } as const
const FACTORIES: ReadonlySet<string> = new Set(Object.values(FACTORY))
const TRANSLATOR_SOURCES: ReadonlySet<string> = new Set(["use-intl", "use-intl/react"])
const METHODS: ReadonlyMap<string, TranslatorMethod> = new Map(
  Object.values(TRANSLATOR_METHOD)
    .filter((method) => method !== TRANSLATOR_METHOD.CALL)
    .map((method) => [method, method]),
)
const OPTION = { MESSAGES: "messages", NAMESPACE: "namespace" } as const
const NAMESPACE_LOADER = "loadNamespace"
const PROMISE_ALL = { METHOD: "all", OWNER: "Promise" } as const
const MESSAGE_PROPERTY = "message"
const CONSTANT = "const"
export const WHOLE_KEY: Shape = ["", ""]
const LAST = -1
const NAME = /^[\w.-]+$/u
const LINE_BREAK = "\n"
const FUNCTIONS: ReadonlySet<string> = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"])
const TYPE_DECLARATIONS: ReadonlySet<string> = new Set(["TSEnumDeclaration", "TSInterfaceDeclaration", "TSTypeAliasDeclaration"])
const ESCAPED: TranslatorCall = { method: TRANSLATOR_METHOD.CALL }

const unwrapped = (node: ESTree.Node): ESTree.Node => {
  if (node.type === "AwaitExpression") {
    return unwrapped(node.argument)
  }

  if (
    node.type === "ParenthesizedExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSNonNullExpression" ||
    node.type === "TSSatisfiesExpression"
  ) {
    return unwrapped(node.expression)
  }

  return node
}

const descendants = (node: ESTree.Node, enter: (child: ESTree.Node) => boolean): void => {
  if (enter(node)) {
    for (const [, child] of childNodes(node)) {
      descendants(child, enter)
    }
  }
}

const isType = ({ declaration }: { readonly declaration: ESTree.Node }): number => Number(TYPE_DECLARATIONS.has(declaration.type))

const indexOf = (project: Project, file: string): IndexedModule => {
  const known = project.modules.get(file)

  if (known !== undefined) {
    return known
  }

  const source = project.read(file)
  const module = analyzeModule(file, source)
  const targets = new Map<ESTree.Node, Target>()
  const references = new Map<ESTree.Node, readonly ESTree.Node[]>()

  for (const binding of [...module.locals, ...module.bindings].toSorted((left, right) => isType(left) - isType(right))) {
    const target: Target = "source" in binding ? { path: binding.path, source: binding.source } : { declaration: binding.declaration }

    references.set(binding.declaration, binding.references)

    for (const reference of binding.references.filter((node) => !targets.has(node))) {
      targets.set(reference, target)
    }
  }

  const indexed = { file, module, references, source, targets }

  project.modules.set(file, indexed)

  return indexed
}

const propertyName = (key: ESTree.PropertyKey): string => {
  if (key.type === "Identifier") {
    return key.name
  }

  return key.type === "Literal" && typeof key.value === "string" ? key.value : ""
}

const propertyOf = ({ file, node }: Located, name: string): Located[] => {
  if (node.type !== "ObjectExpression") {
    return []
  }

  return node.properties.flatMap((property) =>
    property.type === "Property" && !property.computed && propertyName(property.key) === name ? [{ file, node: property.value }] : [],
  )
}

const isConstant = (indexed: IndexedModule, declarator: ESTree.Node): boolean => {
  const statement = indexed.module.parents.get(declarator)

  return statement?.type === "VariableDeclaration" && statement.kind === CONSTANT
}

const isPromiseAll = (node: ESTree.Node): boolean =>
  node.type === "MemberExpression" &&
  node.object.type === "Identifier" &&
  node.object.name === PROMISE_ALL.OWNER &&
  node.property.type === "Identifier" &&
  node.property.name === PROMISE_ALL.METHOD

const elementAt = ({ file, node }: Located, index: number): Located[] => {
  const value = unwrapped(node)

  if (value.type === "CallExpression" && isPromiseAll(value.callee)) {
    return value.arguments.slice(0, 1).flatMap((list) => elementAt({ file, node: list }, index))
  }

  const elements = value.type === "ArrayExpression" ? value.elements.slice(index, index + 1) : []

  return elements.flatMap((element) => (element === null || element.type === "SpreadElement" ? [] : [{ file, node: element }]))
}

const declaredValue = (indexed: IndexedModule, declaration: ESTree.Node): Located[] => {
  if (declaration.type === "VariableDeclarator") {
    const isValue = declaration.init !== null && declaration.id.type === "Identifier" && isConstant(indexed, declaration)

    return isValue && declaration.init !== null ? [{ file: indexed.file, node: declaration.init }] : []
  }

  const pattern = indexed.module.parents.get(declaration)
  const declarator = pattern === undefined ? pattern : indexed.module.parents.get(pattern)

  if (pattern?.type !== "ArrayPattern" || declarator?.type !== "VariableDeclarator" || declarator.init === null) {
    return []
  }

  const { init } = declarator
  const indexes = pattern.elements.flatMap((element, index) => (element === declaration ? [index] : []))

  return isConstant(indexed, declarator) ? indexes.flatMap((index) => elementAt({ file: indexed.file, node: init }, index)) : []
}

const reexportedValue = (project: Project, { file, node }: Located, name: string): Located[] => {
  if (node.type !== "ExportNamedDeclaration" || node.source === null) {
    return []
  }

  const origin = resolveSourceFile(file, node.source.value, project.files)
  const specifiers = node.specifiers.filter(({ exported }) => nameOf(exported) === name)

  return origin === undefined ? [] : specifiers.flatMap(({ local }) => exportedValue(project, origin, nameOf(local)))
}

const exportedValue = (project: Project, file: string, name: string): Located[] => {
  const indexed = indexOf(project, file)
  const local = indexed.module.bindings.find(
    (binding) => binding.kind === BINDING_KIND.LOCAL && binding.name === name && binding.declaration.type === "VariableDeclarator",
  )

  if (local !== undefined) {
    return declaredValue(indexed, local.declaration)
  }

  return indexed.module.program.body.flatMap((statement) => reexportedValue(project, { file, node: statement }, name)).slice(0, 1)
}

const definitionOf = (project: Project, { file, node }: Located): Located[] => {
  const indexed = indexOf(project, file)
  const target = indexed.targets.get(node)

  if (target?.declaration !== undefined) {
    return declaredValue(indexed, target.declaration)
  }

  const [name] = target?.path ?? []

  if (target?.source === undefined || name === undefined) {
    return []
  }

  const origin = resolveSourceFile(file, target.source, project.files)

  return origin === undefined ? [] : exportedValue(project, origin, name)
}

const valueOf = (project: Project, located: Located, seen: Set<ESTree.Node>): Located[] => {
  const node = unwrapped(located.node)

  if (seen.has(node)) {
    return []
  }

  seen.add(node)

  if (node.type === "Identifier") {
    return definitionOf(project, { file: located.file, node }).flatMap((definition) => valueOf(project, definition, seen))
  }

  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    const { name } = node.property

    return valueOf(project, { file: located.file, node: node.object }, seen)
      .flatMap((owner) => propertyOf(owner, name))
      .flatMap((member) => valueOf(project, member, seen))
  }

  return [{ file: located.file, node }]
}

const joined = (left: Shape, right: Shape): Shape => [...left.slice(0, LAST), `${left.at(LAST) ?? ""}${right[0] ?? ""}`, ...right.slice(1)]

const cooked = (element: ESTree.TemplateElement | undefined): string => element?.value.cooked ?? ""

const templateShapes = (project: Project, { file, node }: Located, seen: ReadonlySet<ESTree.Node>): Shape[] => {
  if (node.type !== "TemplateLiteral") {
    return [WHOLE_KEY]
  }

  return node.expressions.reduce<Shape[]>(
    (shapes, expression, index) =>
      shapes.flatMap((shape) =>
        shapesOf(project, { file, node: expression }, seen).map((part) => joined(joined(shape, part), [cooked(node.quasis[index + 1])])),
      ),
    [[cooked(node.quasis[0])]],
  )
}

const shapesOf = (project: Project, located: Located, seen: ReadonlySet<ESTree.Node> = new Set()): Shape[] => {
  const [value] = valueOf(project, located, new Set(seen))

  if (value === undefined || seen.has(value.node)) {
    return [WHOLE_KEY]
  }

  const { file, node } = value
  const inner = new Set([...seen, node])

  if (node.type === "Literal" && typeof node.value === "string") {
    return [[node.value]]
  }

  if (node.type === "ConditionalExpression") {
    return [node.consequent, node.alternate].flatMap((branch) => shapesOf(project, { file, node: branch }, inner))
  }

  if (node.type === "LogicalExpression") {
    return [node.left, node.right].flatMap((side) => shapesOf(project, { file, node: side }, inner))
  }

  return templateShapes(project, value, inner)
}

const stringsOf = (project: Project, located: Located): string[] => {
  const shapes = shapesOf(project, located)

  return shapes.every((shape) => shape.length === 1) ? shapes.flat() : []
}

const optionsOf = (project: Project, call: Located): Located[] => {
  const { file, node } = call
  const options = node.type === "CallExpression" ? node.arguments.slice(0, 1) : []

  return options.flatMap((option) => valueOf(project, { file, node: option }, new Set()))
}

const isNamespaceLoad = ({ node }: Located): boolean =>
  node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === NAMESPACE_LOADER

const loadedNamespaces = (project: Project, messages: Located): string[] =>
  valueOf(project, messages, new Set())
    .filter((value) => isNamespaceLoad(value))
    .flatMap((load) => optionsOf(project, load))
    .flatMap((options) => propertyOf(options, OPTION.NAMESPACE))
    .flatMap((namespace) => stringsOf(project, namespace))

const namespacesOf = (project: Project, file: string, { call, factory }: FactoryCall): string[] => {
  const options = optionsOf(project, { file, node: call })

  if (factory === FACTORY.USE) {
    return call.arguments.length === 0 ? [""] : options.flatMap((option) => stringsOf(project, option))
  }

  const namespaces = options.flatMap((option) => propertyOf(option, OPTION.NAMESPACE))

  if (namespaces.length > 0) {
    return namespaces.flatMap((namespace) => stringsOf(project, namespace))
  }

  return options.flatMap((option) => propertyOf(option, OPTION.MESSAGES)).flatMap((messages) => loadedNamespaces(project, messages))
}

const factoryCalls = (indexed: IndexedModule): FactoryCall[] =>
  indexed.module.bindings.flatMap((binding) => {
    const [factory = ""] = binding.path
    const isFactory = binding.kind === BINDING_KIND.IMPORT && TRANSLATOR_SOURCES.has(binding.source) && FACTORIES.has(factory)

    return (isFactory ? binding.references : []).flatMap((reference) => {
      const call = indexed.module.parents.get(reference)

      return call?.type === "CallExpression" && call.callee === reference ? [{ call, factory }] : []
    })
  })

const outermost = (indexed: IndexedModule, node: ESTree.Node): ESTree.Node => {
  const parent = indexed.module.parents.get(node)

  return parent !== undefined && unwrapped(parent) === unwrapped(node) ? outermost(indexed, parent) : node
}

const callAt = (indexed: IndexedModule, reference: ESTree.Node): TranslatorCall => {
  const parent = indexed.module.parents.get(reference)

  if (parent?.type === "CallExpression" && parent.callee === reference) {
    return { call: parent, method: TRANSLATOR_METHOD.CALL }
  }

  const method = METHODS.get(parent?.type === "MemberExpression" && parent.property.type === "Identifier" ? parent.property.name : "")
  const call = parent === undefined ? parent : indexed.module.parents.get(parent)

  return method !== undefined && call?.type === "CallExpression" && call.callee === parent ? { call, method } : ESCAPED
}

const translatorCalls = (indexed: IndexedModule, factory: ESTree.CallExpression): TranslatorCall[] => {
  const translator = outermost(indexed, factory)
  const parent = indexed.module.parents.get(translator)

  if (parent?.type === "CallExpression" && parent.callee === translator) {
    return [{ call: parent, method: TRANSLATOR_METHOD.CALL }]
  }

  const references = parent?.type === "VariableDeclarator" && parent.id.type === "Identifier" ? indexed.references.get(parent) : []

  return (references ?? [])
    .filter((reference) => indexed.module.parents.get(reference)?.type !== "ArrayExpression")
    .map((reference) => callAt(indexed, reference))
}

const lineAt = (source: string, offset: number): number => source.slice(0, offset).split(LINE_BREAK).length

const readsOf = (project: Project, indexed: IndexedModule, factory: FactoryCall): KeyRead[] => {
  const namespaces = namespacesOf(project, indexed.file, factory)

  return translatorCalls(indexed, factory.call).flatMap(({ call = factory.call, method }) => {
    const [argument] = call === factory.call ? [] : call.arguments
    const shapes = argument ? shapesOf(project, { file: indexed.file, node: argument }) : [WHOLE_KEY]
    const line = lineAt(indexed.source, call.start)

    return namespaces.flatMap((namespace) =>
      shapes.map((shape) => ({
        file: indexed.file,
        line,
        method,
        parts: namespace.length > 0 ? joined([`${namespace}${KEY_SEPARATOR}`], shape) : shape,
      })),
    )
  })
}

const isFunction = (node: ESTree.Node): boolean => FUNCTIONS.has(node.type)

const addNames = (names: Set<string>, values: readonly string[]): void => {
  for (const value of values.filter((candidate) => NAME.test(candidate))) {
    names.add(value)
  }
}

const literalNames = (node: ESTree.Node, names: Set<string>, entersFunctions: boolean): void => {
  descendants(node, (child) => {
    if (child.type === "Literal" && typeof child.value === "string") {
      addNames(names, [child.value])
    }

    if (child.type === "TemplateLiteral" && child.expressions.length === 0) {
      addNames(names, [cooked(child.quasis[0])])
    }

    if (child.type === "Property" && !child.computed) {
      addNames(names, [propertyName(child.key)])
    }

    return entersFunctions || !isFunction(child)
  })
}

const declarationsOf = (statement: ESTree.Node): ESTree.Node[] => {
  if (statement.type === "ExportNamedDeclaration") {
    return statement.declaration === null ? [] : declarationsOf(statement.declaration)
  }

  if (statement.type === "VariableDeclaration") {
    return statement.declarations.flatMap(({ init }) => (init === null || isFunction(unwrapped(init)) ? [] : [init]))
  }

  return TYPE_DECLARATIONS.has(statement.type) ? [statement] : []
}

const declaredNames = (indexed: IndexedModule, names: Set<string>): void => {
  for (const declaration of indexed.module.program.body.flatMap((statement) => declarationsOf(statement))) {
    literalNames(declaration, names, false)
  }
}

const messageNames = (project: Project, indexed: IndexedModule, names: Set<string>): void => {
  descendants(indexed.module.program, (node) => {
    if (node.type === "Property" && !node.computed && propertyName(node.key) === MESSAGE_PROPERTY) {
      addNames(names, stringsOf(project, { file: indexed.file, node: node.value }))
    }

    return true
  })
}

const attributeNames = (project: Project, file: string, element: ESTree.JSXOpeningElement): string[] =>
  element.attributes
    .flatMap((attribute) => (attribute.type === "JSXAttribute" && attribute.value !== null ? [attribute.value] : []))
    .flatMap((value) => (value.type === "JSXExpressionContainer" ? [value.expression] : [value]))
    .flatMap((expression) => stringsOf(project, { file, node: expression }))

const elementNames = (project: Project, indexed: IndexedModule, binding: ImportBinding): string[] =>
  binding.references.flatMap((reference) => {
    const element = indexed.module.parents.get(reference)

    return element?.type === "JSXOpeningElement" && element.name === reference ? attributeNames(project, indexed.file, element) : []
  })

const givenNames = (project: Project, indexed: IndexedModule, given: Map<string, Set<string>>): void => {
  for (const binding of indexed.module.bindings) {
    const names = binding.kind === BINDING_KIND.IMPORT ? elementNames(project, indexed, binding) : []
    const origin = names.length > 0 && "source" in binding && resolveSourceFile(indexed.file, binding.source, project.files)

    if (typeof origin === "string") {
      const known = given.get(origin) ?? new Set<string>()

      addNames(known, names)
      given.set(origin, known)
    }
  }
}

export const analyzeTranslations = (files: readonly string[], read: (file: string) => string): TranslationUsage => {
  const project: Project = { files: new Set(files), modules: new Map(), read }
  const declared = new Set<string>()
  const given = new Map<string, Set<string>>()
  const own = new Map<string, Set<string>>()
  const reads: KeyRead[] = []

  for (const file of files) {
    const indexed = indexOf(project, file)
    const names = new Set<string>()

    literalNames(indexed.module.program, names, true)
    own.set(file, names)
    declaredNames(indexed, declared)
    messageNames(project, indexed, declared)
    givenNames(project, indexed, given)
    reads.push(...factoryCalls(indexed).flatMap((factory) => readsOf(project, indexed, factory)))
  }

  return { declared, given, own, reads }
}
