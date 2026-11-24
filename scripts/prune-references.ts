import { posix } from "node:path"
import type { ESTree } from "vite/rolldown/utils"

import { BINDING_KIND, type ModuleBinding, type SourceModule, analyzeModule, childNodes, isNode, nameOf } from "./module-bindings.ts"

const ROOT_ALIAS = "~/"
const RELATIVE_PREFIX = "."
const MODULE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"] as const
const QUERY = /\?.*$/u
const CODE_FILE = /\.[cm]?[jt]sx?$/u
const DECLARATION_FILE = ".d.ts"
const STATEMENT = /(?:Declaration|Statement)$/u
const TRAILING_SEPARATOR = /^\s*[,;]/u
const PATH_SEPARATOR = "."
const LINE_BREAK = "\n"
const FUNCTIONS: ReadonlySet<string> = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"])
const TYPE_KIND = "type"
const SPECIFIERS = "specifiers"

export interface PruneProblem {
  readonly column: number
  readonly file: string
  readonly line: number
  readonly reason: string
}

export interface ProjectPrune {
  readonly deleted: ReadonlySet<string>
  readonly generated: ReadonlySet<string>
  readonly kept: readonly string[]
  readonly names: ReadonlyMap<string, readonly string[]>
  readonly namespaces: ReadonlySet<string>
  readonly read: (file: string) => string
}

export interface PrunedProject {
  readonly problems: readonly PruneProblem[]
  readonly sources: ReadonlyMap<string, string>
}

type Paths = ReadonlyMap<string, ReadonlySet<string>>

interface Context {
  readonly deleted: ReadonlySet<string>
  readonly files: ReadonlySet<string>
  readonly names: readonly string[]
  readonly namespaces: ReadonlySet<string>
  readonly paths: Paths
}

interface FilePrune {
  readonly changed: boolean
  readonly file: string
  readonly problems: readonly PruneProblem[]
  readonly removed: ReadonlySet<string>
  readonly source: string
}

interface Prune {
  readonly context: Context
  readonly file: string
  readonly module: SourceModule
  readonly problems: PruneProblem[]
  readonly removed: Set<string>
  readonly source: string
  readonly targets: Set<ESTree.Node>
  readonly unprunable: ESTree.Node[]
}

interface Edit {
  readonly end: number
  readonly start: number
  readonly text: string
}

interface Owner {
  readonly module: string | undefined
  readonly path: readonly string[]
}

interface Neighbours {
  readonly keptAfter: boolean
  readonly keptBefore: boolean
  readonly next: ESTree.Node | undefined
  readonly previous: ESTree.Node | undefined
}

interface ParsedFile {
  readonly file: string
  readonly module: SourceModule
  readonly source: string
}

interface MemberStep {
  readonly name: string
  readonly node: ESTree.Node
}

const resolveFile = (from: string, specifier: string, files: ReadonlySet<string>): string | undefined => {
  const path = specifier.replace(QUERY, "")
  const isAliased = path.startsWith(ROOT_ALIAS)
  const base = isAliased ? path.slice(ROOT_ALIAS.length) : posix.join(posix.dirname(from), path)
  const candidates = isAliased || path.startsWith(RELATIVE_PREFIX) ? MODULE_SUFFIXES.map((suffix) => `${base}${suffix}`) : []

  return candidates.find((candidate) => files.has(candidate))
}

export const resolveModule = (
  from: string,
  specifier: string,
  { deleted, files }: Pick<Context, "deleted" | "files">,
): string | undefined => (deleted.has(specifier) ? specifier : resolveFile(from, specifier, files))

const pathsOf = (context: Context, owner: string | undefined): string[] =>
  owner === undefined ? [] : [...(context.paths.get(owner) ?? [])]

const isGone = (context: Context, owner: string | undefined, path: readonly string[]): boolean =>
  owner !== undefined &&
  (context.deleted.has(owner) ||
    path.some((_, index) => context.paths.get(owner)?.has(path.slice(0, index + 1).join(PATH_SEPARATOR)) === true))

const positionAt = (source: string, offset: number): Pick<PruneProblem, "column" | "line"> => ({
  column: offset - source.lastIndexOf(LINE_BREAK, offset - 1),
  line: source.slice(0, offset).split(LINE_BREAK).length,
})

const problemAt = (prune: Prune, node: ESTree.Node, reason: string): PruneProblem => ({
  file: prune.file,
  ...positionAt(prune.source, node.start),
  reason,
})

const ancestorsOf = (parents: ReadonlyMap<ESTree.Node, ESTree.Node>, node: ESTree.Node): ESTree.Node[] => {
  const ancestors: ESTree.Node[] = []

  for (let parent = parents.get(node); parent !== undefined; parent = parents.get(parent)) {
    ancestors.push(parent)
  }

  return ancestors
}

const arrayElement = (child: ESTree.Node, [parent, ...rest]: readonly ESTree.Node[]): ESTree.Node[] => {
  if (parent === undefined) {
    return []
  }

  return parent.type === "ArrayExpression" ? [child] : arrayElement(parent, rest)
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

const memberNames = (parent: ESTree.Node, child: ESTree.Node): string[] => {
  if (parent.type === "TSQualifiedName" || parent.type === "JSXMemberExpression") {
    return [parent.type === "TSQualifiedName" ? parent.right.name : parent.property.name]
  }

  if (parent.type !== "MemberExpression" || parent.object !== child) {
    return []
  }

  if (!parent.computed) {
    return parent.property.type === "Identifier" ? [parent.property.name] : []
  }

  return parent.property.type === "Literal" && typeof parent.property.value === "string" ? [parent.property.value] : []
}

const memberSteps = (parents: ReadonlyMap<ESTree.Node, ESTree.Node>, node: ESTree.Node): MemberStep[] => {
  const steps: MemberStep[] = []
  let child = node

  for (const parent of ancestorsOf(parents, node)) {
    const [name] = memberNames(parent, child)

    if (name === undefined) {
      break
    }

    steps.push({ name, node: parent })
    child = parent
  }

  return steps
}

const cut = (prune: Prune, node: ESTree.Node, reported: ESTree.Node): void => {
  const ancestors = ancestorsOf(prune.module.parents, node)
  const [target] = [...arrayElement(node, ancestors), ...nearestItem(node, ancestors)]

  if (target === undefined) {
    prune.unprunable.push(reported)

    return
  }

  prune.targets.add(target)

  if (target.type === "ExportSpecifier") {
    prune.removed.add(nameOf(target.exported))
  }
}

const ownerOf = (prune: Prune, binding: ModuleBinding): Owner => ({
  module: binding.kind === BINDING_KIND.IMPORT ? resolveModule(prune.file, binding.source, prune.context) : prune.file,
  path: binding.path,
})

const goneMember = (prune: Prune, owner: Owner, reference: ESTree.Node): ESTree.Node[] => {
  const steps = memberSteps(prune.module.parents, reference)
  const path = [...owner.path, ...steps.map(({ name }) => name)]

  return steps
    .filter((_, index) => isGone(prune.context, owner.module, path.slice(0, owner.path.length + index + 1)))
    .slice(0, 1)
    .map(({ node }) => node)
}

const pruneBindings = (prune: Prune): void => {
  for (const binding of prune.module.bindings) {
    const owner = ownerOf(prune, binding)

    if (isGone(prune.context, owner.module, owner.path)) {
      prune.targets.add(binding.declaration)

      for (const reference of binding.references) {
        cut(prune, reference, reference)
      }
    } else if (pathsOf(prune.context, owner.module).length > 0) {
      for (const member of binding.references.flatMap((reference) => goneMember(prune, owner, reference))) {
        cut(prune, member, member)
      }
    }
  }
}

const pruneExportFrom = (prune: Prune, statement: ESTree.ExportNamedDeclaration, source: ESTree.StringLiteral): void => {
  const owner = resolveModule(prune.file, source.value, prune.context)
  const paths = pathsOf(prune.context, owner)

  for (const specifier of statement.specifiers) {
    const local = nameOf(specifier.local)
    const exported = nameOf(specifier.exported)

    if (isGone(prune.context, owner, [local])) {
      prune.targets.add(specifier)
      prune.removed.add(exported)
    }

    for (const path of paths.filter((candidate) => candidate.startsWith(`${local}${PATH_SEPARATOR}`))) {
      prune.removed.add(`${exported}${path.slice(local.length)}`)
    }
  }
}

const pruneExportAll = (prune: Prune, statement: ESTree.ExportAllDeclaration): void => {
  const owner = resolveModule(prune.file, statement.source.value, prune.context)
  const prefix = statement.exported === null ? "" : `${nameOf(statement.exported)}${PATH_SEPARATOR}`

  if (owner !== undefined && prune.context.deleted.has(owner)) {
    prune.targets.add(statement)

    if (statement.exported === null) {
      prune.problems.push(
        problemAt(
          prune,
          statement,
          "`export *` from a removed file: the names it brought cannot be followed into the files that import this one",
        ),
      )
    } else {
      prune.removed.add(nameOf(statement.exported))
    }
  }

  for (const path of pathsOf(prune.context, owner)) {
    prune.removed.add(`${prefix}${path}`)
  }
}

const pruneModuleStatements = (prune: Prune): void => {
  for (const statement of prune.module.program.body) {
    if (
      statement.type === "ImportDeclaration" &&
      isGone(prune.context, resolveModule(prune.file, statement.source.value, prune.context), [])
    ) {
      prune.targets.add(statement)
    }

    if (statement.type === "ExportNamedDeclaration" && statement.source !== null) {
      pruneExportFrom(prune, statement, statement.source)
    }

    if (statement.type === "ExportAllDeclaration") {
      pruneExportAll(prune, statement)
    }
  }
}

const keyIs = (key: ESTree.PropertyKey, name: string): boolean =>
  (key.type === "Identifier" && key.name === name) || (key.type === "Literal" && key.value === name)

const propertyAt = (value: ESTree.Node, name: string, rest: readonly string[]): ESTree.Node[] => {
  if (value.type === "ParenthesizedExpression" || value.type === "TSAsExpression" || value.type === "TSSatisfiesExpression") {
    return propertyAt(value.expression, name, rest)
  }

  if (value.type !== "ObjectExpression") {
    return []
  }

  return value.properties.flatMap((property) => {
    if (property.type !== "Property" || property.computed || !keyIs(property.key, name)) {
      return []
    }

    const [next, ...after] = rest

    return next === undefined ? [property] : propertyAt(property.value, next, after)
  })
}

const declaredProperties = (declaration: ESTree.Node, name: string, rest: readonly string[]): ESTree.Node[] =>
  declaration.type === "VariableDeclarator" && declaration.init !== null ? propertyAt(declaration.init, name, rest) : []

const pruneNames = (prune: Prune): void => {
  for (const name of prune.context.names) {
    const [first, next, ...after] = name.split(PATH_SEPARATOR)
    const declarations = prune.module.bindings
      .filter((binding) => binding.kind === BINDING_KIND.LOCAL && binding.name === first)
      .map(({ declaration }) => declaration)
    const properties = next === undefined ? [] : declarations.flatMap((declaration) => declaredProperties(declaration, next, after))

    if (declarations.length === 0 || (next !== undefined && properties.length === 0)) {
      prune.problems.push(
        problemAt(prune, prune.module.program, `the removed areas take away \`${name}\`, which ${prune.file} does not declare`),
      )
    }

    for (const property of properties) {
      prune.targets.add(property)
    }
  }
}

const pruneDynamicImports = (prune: Prune): void => {
  for (const { node, source } of prune.module.imports) {
    if (isGone(prune.context, resolveModule(prune.file, source, prune.context), [])) {
      const functions =
        node.type === "ImportExpression" ? ancestorsOf(prune.module.parents, node).filter((ancestor) => FUNCTIONS.has(ancestor.type)) : []
      const [owner = node] = functions

      cut(prune, owner, node)
    }
  }
}

const pruneNamespaces = (prune: Prune): void => {
  for (const { elements } of prune.module.arrays) {
    for (const element of elements) {
      if (element?.type === "Literal" && typeof element.value === "string" && prune.context.namespaces.has(element.value)) {
        prune.targets.add(element)
      }
    }
  }
}

const isEmptiedArray = (prune: Prune, value: ESTree.Node): boolean =>
  value.type === "ArrayExpression" &&
  value.elements.length > 0 &&
  value.elements.every((element) => element !== null && prune.targets.has(element))

const ownsEmptiedArray = (prune: Prune, element: ESTree.ArrayExpression["elements"][number]): element is ESTree.ObjectExpression =>
  element?.type === "ObjectExpression" &&
  !prune.targets.has(element) &&
  element.properties.some((property) => property.type === "Property" && isEmptiedArray(prune, property.value))

const pruneEmptiedArrays = (prune: Prune): void => {
  const owners = prune.module.arrays.flatMap(({ elements }) => elements.filter((element) => ownsEmptiedArray(prune, element)))

  if (owners.length > 0) {
    for (const owner of owners) {
      prune.targets.add(owner)
    }

    pruneEmptiedArrays(prune)
  }
}

const isRemoved = (prune: Prune, node: ESTree.Node): boolean => prune.targets.has(node) || isEmptied(prune, node)

const allRemoved = (prune: Prune, nodes: readonly ESTree.Node[]): boolean =>
  nodes.length > 0 && nodes.every((node) => isRemoved(prune, node))

const isEmptiedPattern = (prune: Prune, node: ESTree.Node): boolean => node.type === "ObjectPattern" && allRemoved(prune, node.properties)

const isEmptied = (prune: Prune, node: ESTree.Node): boolean => {
  if (node.type === "ImportDeclaration") {
    return allRemoved(prune, node.specifiers)
  }

  if (node.type === "ExportNamedDeclaration") {
    return node.declaration === null ? allRemoved(prune, node.specifiers) : isRemoved(prune, node.declaration)
  }

  if (node.type === "ExportDefaultDeclaration") {
    return isRemoved(prune, node.declaration)
  }

  if (node.type === "VariableDeclaration") {
    return allRemoved(prune, node.declarations)
  }

  if (node.type === "VariableDeclarator") {
    return isEmptiedPattern(prune, node.id)
  }

  return node.type === "Property" && isEmptiedPattern(prune, node.value)
}

const childGroups = (node: ESTree.Node): ESTree.Node[][] =>
  Object.entries(node).flatMap(([key, value]: [string, unknown]) => {
    const values: unknown[] = Array.isArray(value) ? value : [value]
    const nodes = values.filter((child) => isNode(child))

    return key === SPECIFIERS || nodes.length === 0 ? [] : [nodes]
  })

const removedNodes = (prune: Prune, node: ESTree.Node): ESTree.Node[] =>
  childNodes(node).flatMap(([, child]) => (isRemoved(prune, child) ? [child] : removedNodes(prune, child)))

const isInside = (ranges: readonly ESTree.Node[], node: ESTree.Node): boolean =>
  ranges.some((range) => node.start >= range.start && node.end <= range.end)

const settleUnused = (prune: Prune): void => {
  const removed = removedNodes(prune, prune.module.program)
  const candidates = [
    ...prune.module.bindings.filter((binding) => binding.kind === BINDING_KIND.IMPORT || binding.removable),
    ...prune.module.locals,
  ]
  const unused = candidates.filter(
    ({ declaration, references }) =>
      references.length > 0 && references.every((reference) => isInside(removed, reference)) && !isInside(removed, declaration),
  )
  const declarations = [...new Set(unused.map(({ declaration }) => declaration))].filter((declaration) =>
    candidates.every((candidate) => candidate.declaration !== declaration || unused.includes(candidate)),
  )

  if (declarations.length > 0) {
    for (const declaration of declarations) {
      prune.targets.add(declaration)
    }

    settleUnused(prune)
  }
}

const removal = (prune: Prune, item: ESTree.Node, { keptAfter, keptBefore, next, previous }: Neighbours): Edit => {
  if (keptAfter && next !== undefined) {
    return { end: next.start, start: item.start, text: "" }
  }

  const separator = next === undefined && !keptBefore ? (TRAILING_SEPARATOR.exec(prune.source.slice(item.end))?.[0].length ?? 0) : 0

  return { end: item.end + separator, start: previous?.end ?? item.start, text: "" }
}

const kindPrefix = (kind: string | undefined): string => (kind === TYPE_KIND ? `${TYPE_KIND} ` : "")

const importText = (prune: Prune, node: ESTree.ImportDeclaration): string => {
  const kept = node.specifiers.filter((specifier) => !prune.targets.has(specifier))
  const named = kept.flatMap((specifier) =>
    specifier.type === "ImportSpecifier" ? [prune.source.slice(specifier.start, specifier.end)] : [],
  )
  const clauses = [
    ...kept.flatMap((specifier) => (specifier.type === "ImportDefaultSpecifier" ? [specifier.local.name] : [])),
    ...kept.flatMap((specifier) => (specifier.type === "ImportNamespaceSpecifier" ? [`* as ${specifier.local.name}`] : [])),
    ...(named.length > 0 ? [`{ ${named.join(", ")} }`] : []),
  ]

  return `import ${kindPrefix(node.importKind)}${clauses.join(", ")} from `
}

const exportText = (prune: Prune, node: ESTree.ExportNamedDeclaration): string => {
  const kept = node.specifiers.filter((specifier) => !prune.targets.has(specifier)).map(({ end, start }) => prune.source.slice(start, end))

  return `export ${kindPrefix(node.exportKind)}{ ${kept.join(", ")} }${node.source === null ? "" : " from "}`
}

const specifierEdits = (prune: Prune, node: ESTree.Node): Edit[] => {
  if (node.type === "ImportDeclaration" && node.specifiers.some((specifier) => prune.targets.has(specifier))) {
    return [{ end: node.source.start, start: node.start, text: importText(prune, node) }]
  }

  if (node.type === "ExportNamedDeclaration" && node.specifiers.some((specifier) => prune.targets.has(specifier))) {
    return [{ end: node.source?.start ?? node.end, start: node.start, text: exportText(prune, node) }]
  }

  return []
}

const itemEdits = (prune: Prune, item: ESTree.Node, neighbours: Neighbours): Edit[] =>
  isRemoved(prune, item) ? [removal(prune, item, neighbours)] : editsOf(prune, item)

const listEdits = (prune: Prune, items: readonly ESTree.Node[]): Edit[] => {
  const removed = items.map((item) => isRemoved(prune, item))

  return items.flatMap((item, index) =>
    itemEdits(prune, item, {
      keptAfter: removed.slice(index + 1).includes(false),
      keptBefore: removed.slice(0, index).includes(false),
      next: items[index + 1],
      previous: items[index - 1],
    }),
  )
}

const editsOf = (prune: Prune, node: ESTree.Node): Edit[] => [
  ...specifierEdits(prune, node),
  ...childGroups(node).flatMap((items) => listEdits(prune, items)),
]

const applyEdits = (source: string, edits: readonly Edit[]): string =>
  edits
    .toSorted((left, right) => right.start - left.start)
    .reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, source)

const unprunableReason = (prune: Prune, node: ESTree.Node): string =>
  `\`${prune.source.slice(node.start, node.end)}\` names what the removed areas take away, and no array element, object property or JSX element around it can go with it`

const finish = (prune: Prune): FilePrune => {
  const removed = prune.targets.size > 0 ? removedNodes(prune, prune.module.program) : []
  const problems = prune.unprunable
    .filter((node) => !isInside(removed, node))
    .map((node) => problemAt(prune, node, unprunableReason(prune, node)))

  return {
    changed: prune.targets.size > 0,
    file: prune.file,
    problems: [...prune.problems, ...problems],
    removed: prune.removed,
    source: prune.targets.size > 0 ? applyEdits(prune.source, editsOf(prune, prune.module.program)) : prune.source,
  }
}

const pruneSource = ({ file, module, source }: ParsedFile, context: Context): FilePrune => {
  const prune: Prune = { context, file, module, problems: [], removed: new Set(context.names), source, targets: new Set(), unprunable: [] }

  pruneModuleStatements(prune)
  pruneBindings(prune)
  pruneNames(prune)
  pruneDynamicImports(prune)
  pruneNamespaces(prune)
  pruneEmptiedArrays(prune)

  if (prune.targets.size > 0) {
    settleUnused(prune)
  }

  return finish(prune)
}

const pathCount = (paths: Paths): number => [...paths.values()].reduce((count, names) => count + names.size, 0)

const compareProblems = (left: PruneProblem, right: PruneProblem): number =>
  left.file.localeCompare(right.file) || left.line - right.line || left.column - right.column

const parse = (read: (file: string) => string, file: string): ParsedFile => {
  const source = read(file)

  return { file, module: analyzeModule(file, source), source }
}

const ambientModulesOf = (files: readonly ParsedFile[]): Set<string> => new Set(files.flatMap(({ module }) => module.ambientModules))

const removedModules = (deletedFiles: ReadonlySet<string>, kept: readonly ParsedFile[], read: (file: string) => string): Set<string> => {
  const declared = ambientModulesOf(kept)
  const ambient = ambientModulesOf([...deletedFiles].filter((file) => file.endsWith(DECLARATION_FILE)).map((file) => parse(read, file)))

  return new Set([...deletedFiles, ...[...ambient].filter((name) => !declared.has(name))])
}

export const pruneProject = ({ deleted: deletedFiles, generated, kept, names, namespaces, read }: ProjectPrune): PrunedProject => {
  const files = new Set([...kept, ...deletedFiles])
  const modules = kept.filter((file) => CODE_FILE.test(file) && !generated.has(file)).map((file) => parse(read, file))
  const deleted = removedModules(deletedFiles, modules, read)
  const settle = (paths: Paths): FilePrune[] => {
    const results = modules.map((parsed) => pruneSource(parsed, { deleted, files, names: names.get(parsed.file) ?? [], namespaces, paths }))
    const discovered = results
      .filter(({ removed }) => removed.size > 0)
      .map(({ file, removed }): [string, ReadonlySet<string>] => [file, removed])
    const next = new Map([...paths, ...discovered])

    return pathCount(next) > pathCount(paths) ? settle(next) : results
  }
  const results = settle(new Map([...names].map(([file, list]) => [file, new Set(list)])))

  return {
    problems: results.flatMap(({ problems }) => problems).toSorted(compareProblems),
    sources: new Map(results.filter(({ changed }) => changed).map(({ file, source }) => [file, source])),
  }
}
