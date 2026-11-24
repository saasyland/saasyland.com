import { type ESTree, parseSync } from "vite/rolldown/utils"

export const BINDING_KIND = { IMPORT: "import", LOCAL: "local" } as const

export const DEFAULT_EXPORT = "default"

type Statement = ESTree.Program["body"][number]

interface Declared {
  readonly declaration: ESTree.Node
  readonly name: string
  readonly removable: boolean
}

interface ImportSite {
  readonly declaration: ESTree.ImportDeclarationSpecifier
  readonly kind: typeof BINDING_KIND.IMPORT
  readonly name: string
  readonly path: readonly string[]
  readonly source: string
  readonly statement: ESTree.ImportDeclaration
}

interface LocalSite extends Declared {
  readonly kind: typeof BINDING_KIND.LOCAL
  readonly path: readonly string[]
  readonly statement: Statement
}

export type ModuleBinding = (ImportSite | LocalSite) & { readonly references: readonly ESTree.Node[] }

export interface LocalDeclaration extends Declared {
  readonly references: readonly ESTree.Node[]
}

export interface DynamicImport {
  readonly node: ESTree.ImportExpression | ESTree.TSImportType
  readonly source: string
}

export interface SourceModule {
  readonly ambientModules: readonly string[]
  readonly arrays: readonly ESTree.ArrayExpression[]
  readonly bindings: readonly ModuleBinding[]
  readonly blocks: readonly ESTree.BlockStatement[]
  readonly imports: readonly DynamicImport[]
  readonly locals: readonly LocalDeclaration[]
  readonly parents: ReadonlyMap<ESTree.Node, ESTree.Node>
  readonly program: ESTree.Program
}

type Pattern = ESTree.BindingPattern | ESTree.BindingProperty | ESTree.BindingRestElement | ESTree.ParamPattern

type Tracked = Declared & { readonly references: ESTree.Node[] }

type Scopes = readonly ReadonlyMap<string, Tracked>[]

type Role = "binding" | "jsxName" | "skip" | "visit"

type NamedReference = Extract<ESTree.Node, { readonly type: "Identifier" | "JSXIdentifier" }>

interface Frame {
  readonly binding: boolean
  readonly scopes: Scopes
}

interface Walk {
  readonly arrays: ESTree.ArrayExpression[]
  readonly blocks: ESTree.BlockStatement[]
  readonly imports: DynamicImport[]
  readonly locals: Tracked[]
  readonly parents: Map<ESTree.Node, ESTree.Node>
  readonly references: ReadonlyMap<string, ESTree.Node[]>
}

const INTRINSIC_ELEMENT = /^[a-z]|-/u

const SKIPPED_KEYS: Readonly<Partial<Record<ESTree.Node["type"], readonly string[]>>> = {
  BreakStatement: ["label"],
  ClassDeclaration: ["id"],
  ClassExpression: ["id"],
  ContinueStatement: ["label"],
  ExportAllDeclaration: ["exported"],
  ExportSpecifier: ["exported"],
  FunctionDeclaration: ["id"],
  FunctionExpression: ["id"],
  ImportAttribute: ["key"],
  ImportDeclaration: ["specifiers"],
  JSXAttribute: ["name"],
  JSXClosingElement: ["name"],
  LabeledStatement: ["label"],
  MetaProperty: ["meta", "property"],
  TSDeclareFunction: ["id"],
  TSEnumDeclaration: ["id"],
  TSEnumMember: ["id"],
  TSImportEqualsDeclaration: ["id"],
  TSImportType: ["qualifier"],
  TSInterfaceDeclaration: ["id"],
  TSMappedType: ["key"],
  TSModuleDeclaration: ["id"],
  TSNamedTupleMember: ["label"],
  TSNamespaceExportDeclaration: ["id"],
  TSQualifiedName: ["right"],
  TSTypeAliasDeclaration: ["id"],
  TSTypeParameter: ["name"],
  TSTypePredicate: ["parameterName"],
}

const PROPERTY_KEYS: Readonly<Partial<Record<ESTree.Node["type"], string>>> = {
  AccessorProperty: "key",
  MemberExpression: "property",
  MethodDefinition: "key",
  Property: "key",
  PropertyDefinition: "key",
  TSAbstractAccessorProperty: "key",
  TSAbstractMethodDefinition: "key",
  TSAbstractPropertyDefinition: "key",
  TSMethodSignature: "key",
  TSPropertySignature: "key",
}

const BINDING_KEYS: Readonly<Partial<Record<ESTree.Node["type"], string>>> = {
  ArrayPattern: "elements",
  ArrowFunctionExpression: "params",
  AssignmentPattern: "left",
  CatchClause: "param",
  FunctionDeclaration: "params",
  FunctionExpression: "params",
  ObjectPattern: "properties",
  RestElement: "argument",
  TSCallSignatureDeclaration: "params",
  TSConstructSignatureDeclaration: "params",
  TSConstructorType: "params",
  TSDeclareFunction: "params",
  TSEmptyBodyFunctionExpression: "params",
  TSFunctionType: "params",
  TSIndexSignature: "parameters",
  TSMethodSignature: "params",
  TSParameterProperty: "parameter",
  VariableDeclarator: "id",
}

export const isNode = (value: unknown): value is ESTree.Node =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"

export const childNodes = (node: ESTree.Node): [string, ESTree.Node][] =>
  Object.entries(node).flatMap(([key, value]: [string, unknown]) => {
    const values: unknown[] = Array.isArray(value) ? value : [value]

    return values.filter((child) => isNode(child)).map((child): [string, ESTree.Node] => [key, child])
  })

export const nameOf = (node: ESTree.ModuleExportName): string => (node.type === "Literal" ? node.value : node.name)

const patternDeclarations = (node: Pattern, owner: ESTree.Node, removable: boolean): Declared[] => {
  if (node.type === "Identifier") {
    return [{ declaration: owner, name: node.name, removable }]
  }

  if (node.type === "ObjectPattern") {
    return node.properties.flatMap((property) => patternDeclarations(property, property, removable))
  }

  if (node.type === "ArrayPattern") {
    return node.elements.flatMap((element) => (element === null ? [] : patternDeclarations(element, element, removable)))
  }

  if (node.type === "Property") {
    return patternDeclarations(node.value, owner, removable)
  }

  if (node.type === "AssignmentPattern") {
    return patternDeclarations(node.left, owner, removable)
  }

  return patternDeclarations(node.type === "RestElement" ? node.argument : node.parameter, owner, removable)
}

const shadows = (node: Pattern): Declared[] => patternDeclarations(node, node, false)

const named = (node: ESTree.Node, name: string, removable: boolean): Declared[] => [{ declaration: node, name, removable }]

const statementDeclarations = (node: ESTree.Node, removable: boolean): Declared[] => {
  if (node.type === "VariableDeclaration") {
    return node.declarations.flatMap((declarator) => patternDeclarations(declarator.id, declarator, removable))
  }

  if (node.type === "ExportNamedDeclaration") {
    return node.declaration === null ? [] : statementDeclarations(node.declaration, false)
  }

  if (node.type === "ExportDefaultDeclaration") {
    return statementDeclarations(node.declaration, false)
  }

  if (node.type === "ClassDeclaration" || node.type === "FunctionDeclaration" || node.type === "TSDeclareFunction") {
    return node.id === null ? [] : named(node, node.id.name, removable)
  }

  if (
    node.type === "TSEnumDeclaration" ||
    node.type === "TSImportEqualsDeclaration" ||
    node.type === "TSInterfaceDeclaration" ||
    node.type === "TSTypeAliasDeclaration"
  ) {
    return named(node, node.id.name, removable)
  }

  return node.type === "TSModuleDeclaration" && node.id.type === "Identifier" ? named(node, node.id.name, false) : []
}

const ownName = (node: { readonly id: ESTree.BindingIdentifier | null }): Declared[] =>
  node.id === null ? [] : named(node.id, node.id.name, false)

const typeParameters = (declaration: ESTree.TSTypeParameterDeclaration | null | undefined): Declared[] =>
  declaration?.params.flatMap(({ name }) => named(name, name.name, false)) ?? []

const inferred = (node: ESTree.Node): Declared[] =>
  node.type === "TSInferType" ? named(node, node.typeParameter.name.name, false) : childNodes(node).flatMap(([, child]) => inferred(child))

const signature = (node: {
  readonly params: readonly Pattern[]
  readonly typeParameters?: ESTree.TSTypeParameterDeclaration | null
}): Declared[] => [...node.params.flatMap((parameter) => shadows(parameter)), ...typeParameters(node.typeParameters)]

const blockDeclarations = (node: ESTree.Node): Declared[] => {
  if (node.type === "BlockStatement" || node.type === "StaticBlock" || node.type === "TSModuleBlock") {
    return node.body.flatMap((statement) => statementDeclarations(statement, true))
  }

  if (node.type === "SwitchStatement") {
    return node.cases.flatMap(({ consequent }) => consequent.flatMap((statement) => statementDeclarations(statement, true)))
  }

  if (node.type === "ForStatement") {
    return node.init === null ? [] : statementDeclarations(node.init, false)
  }

  if (node.type === "ForInStatement" || node.type === "ForOfStatement") {
    return statementDeclarations(node.left, false)
  }

  return node.type === "CatchClause" && node.param !== null ? shadows(node.param) : []
}

const signatureDeclarations = (node: ESTree.Node): Declared[] => {
  if (node.type === "FunctionExpression") {
    return [...ownName(node), ...signature(node)]
  }

  if (node.type === "ClassExpression") {
    return [...ownName(node), ...typeParameters(node.typeParameters)]
  }

  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "TSCallSignatureDeclaration" ||
    node.type === "TSConstructSignatureDeclaration" ||
    node.type === "TSConstructorType" ||
    node.type === "TSDeclareFunction" ||
    node.type === "TSEmptyBodyFunctionExpression" ||
    node.type === "TSFunctionType" ||
    node.type === "TSMethodSignature"
  ) {
    return signature(node)
  }

  if (node.type === "ClassDeclaration" || node.type === "TSInterfaceDeclaration" || node.type === "TSTypeAliasDeclaration") {
    return typeParameters(node.typeParameters)
  }

  if (node.type === "TSMappedType") {
    return named(node.key, node.key.name, false)
  }

  return node.type === "TSConditionalType" ? inferred(node.extendsType) : []
}

const isSkipped = (node: ESTree.Node, key: string): boolean =>
  SKIPPED_KEYS[node.type]?.includes(key) === true ||
  (node.type === "ExportNamedDeclaration" && node.source !== null && key === "specifiers")

const roleOf = (node: ESTree.Node, key: string, binding: boolean): Role => {
  if (PROPERTY_KEYS[node.type] === key) {
    return "computed" in node && node.computed ? "visit" : "skip"
  }

  if (BINDING_KEYS[node.type] === key || (binding && node.type === "Property")) {
    return "binding"
  }

  if (isSkipped(node, key)) {
    return "skip"
  }

  return node.type === "JSXOpeningElement" && key === "name" ? "jsxName" : "visit"
}

const addReference = (walk: Walk, node: NamedReference, scopes: Scopes): void => {
  const local = scopes.findLast((scope) => scope.has(node.name))?.get(node.name)
  const references = local === undefined ? walk.references.get(node.name) : local.references

  references?.push(node)
}

const record = (walk: Walk, node: ESTree.Node, scopes: Scopes): void => {
  if (node.type === "Identifier") {
    addReference(walk, node, scopes)
  }

  if (node.type === "ArrayExpression") {
    walk.arrays.push(node)
  }

  if (node.type === "BlockStatement") {
    walk.blocks.push(node)
  }

  if (node.type === "TSImportType") {
    walk.imports.push({ node, source: node.source.value })
  }

  if (node.type === "ImportExpression" && node.source.type === "Literal") {
    walk.imports.push({ node, source: String(node.source.value) })
  }
}

const visitJsxObject = (walk: Walk, node: ESTree.Node, scopes: Scopes): void => {
  if (node.type === "JSXIdentifier") {
    addReference(walk, node, scopes)
  }

  for (const [key, child] of childNodes(node)) {
    walk.parents.set(child, node)

    if (key === "object") {
      visitJsxObject(walk, child, scopes)
    }
  }
}

const scopeOf = (walk: Walk, node: ESTree.Node): Map<string, Tracked>[] => {
  const declared = [...blockDeclarations(node), ...signatureDeclarations(node)]
  const tracked = declared.map((declaration): Tracked => {
    const references: ESTree.Node[] = []

    return Object.assign(declaration, { references })
  })

  walk.locals.push(...tracked)

  return tracked.length > 0 ? [new Map(tracked.map((entry) => [entry.name, entry]))] : []
}

const visitChildren = (walk: Walk, node: ESTree.Node, frame: Frame): void => {
  const scopes = [...frame.scopes, ...scopeOf(walk, node)]

  for (const [key, child] of childNodes(node)) {
    const role = roleOf(node, key, frame.binding)

    walk.parents.set(child, node)

    if (role !== "skip") {
      VISITORS[role](walk, child, scopes)
    }
  }
}

const VISITORS: Readonly<Record<Exclude<Role, "skip">, (walk: Walk, node: ESTree.Node, scopes: Scopes) => void>> = {
  binding: (walk, node, scopes) => {
    visitChildren(walk, node, { binding: true, scopes })
  },
  jsxName: (walk, node, scopes) => {
    if (node.type !== "JSXIdentifier" || !INTRINSIC_ELEMENT.test(node.name)) {
      visitJsxObject(walk, node, scopes)
    }
  },
  visit: (walk, node, scopes) => {
    record(walk, node, scopes)
    visitChildren(walk, node, { binding: false, scopes })
  },
}

const importedPath = (specifier: ESTree.ImportDeclarationSpecifier): string[] => {
  if (specifier.type === "ImportSpecifier") {
    return [nameOf(specifier.imported)]
  }

  return specifier.type === "ImportDefaultSpecifier" ? [DEFAULT_EXPORT] : []
}

const bindingSites = (statement: Statement): (ImportSite | LocalSite)[] => {
  if (statement.type === "ImportDeclaration") {
    return statement.specifiers.map((specifier) => ({
      declaration: specifier,
      kind: BINDING_KIND.IMPORT,
      name: specifier.local.name,
      path: importedPath(specifier),
      source: statement.source.value,
      statement,
    }))
  }

  return statementDeclarations(statement, true).map((declared) =>
    Object.assign(declared, { kind: BINDING_KIND.LOCAL, path: [declared.name], statement }),
  )
}

const isModuleStatement = (statement: Statement): boolean =>
  statement.type === "ImportDeclaration" ||
  statement.type === "ExportAllDeclaration" ||
  statement.type === "ExportDefaultDeclaration" ||
  statement.type === "ExportNamedDeclaration"

const ambientModules = (program: ESTree.Program): string[] => {
  if (program.body.some((statement) => isModuleStatement(statement))) {
    return []
  }

  return program.body.flatMap((statement) =>
    statement.type === "TSModuleDeclaration" && statement.id.type === "Literal" ? [statement.id.value] : [],
  )
}

export const analyzeModule = (file: string, source: string): SourceModule => {
  const { errors, program } = parseSync(file, source)

  if (errors.length > 0) {
    throw new Error(`${file} does not parse, so its references cannot be pruned: ${errors.map(({ message }) => message).join("; ")}`)
  }

  const references = new Map<string, ESTree.Node[]>()
  const bindings = program.body
    .flatMap((statement) => bindingSites(statement))
    .map((site) => {
      const shared = references.get(site.name) ?? []

      references.set(site.name, shared)

      return Object.assign(site, { references: shared })
    })
  const walk: Walk = { arrays: [], blocks: [], imports: [], locals: [], parents: new Map(), references }

  for (const statement of program.body) {
    walk.parents.set(statement, program)
    VISITORS.visit(walk, statement, [])
  }

  return {
    ambientModules: ambientModules(program),
    arrays: walk.arrays,
    bindings,
    blocks: walk.blocks,
    imports: walk.imports,
    locals: walk.locals,
    parents: walk.parents,
    program,
  }
}
