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
import { LINE_BREAK, applyEdits, editsOf, isRemoved } from "./prune-edits.ts"
import { FUNCTIONS, ancestorsOf, callUnit, emptiedUnit, isRemovableDeclarator, unitOf } from "./prune-units.ts"
import { type ModuleMock, TEST_KIND, type TestCall, isTestFile, moduleMocksOf, testCallsOf } from "./test-cases.ts"

const CODE_FILE = /\.[cm]?[jt]sx?$/u
const DECLARATION_FILE = ".d.ts"
const PATH_SEPARATOR = "."
const AFTER_FIRST_LINE = /\n[\s\S]*/u

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
  readonly deleted: ReadonlySet<string>
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
  readonly deleted: boolean
  readonly file: string
  readonly problems: readonly PruneProblem[]
  readonly removed: ReadonlySet<string>
  readonly source: string
}

interface Prune {
  readonly callbacks: ReadonlyMap<ESTree.Node, TestCall>
  readonly context: Context
  readonly deciding: Set<ESTree.Node>
  readonly emptied: Set<ESTree.Node>
  readonly file: string
  readonly guarded: ReadonlySet<ESTree.Node>
  readonly isDerived: (node: ESTree.Node) => boolean
  readonly mocks: readonly ModuleMock[]
  readonly module: SourceModule
  readonly problems: PruneProblem[]
  readonly removed: Set<string>
  readonly source: string
  readonly stranded: Set<ESTree.Node>
  readonly targets: Set<ESTree.Node>
  readonly tests: readonly TestCall[]
  readonly unprunable: Map<ESTree.Node, ESTree.Node>
}

interface Mark {
  readonly removed: number
  readonly targets: number
  readonly unprunable: number
}

interface Owner {
  readonly module: string | undefined
  readonly path: readonly string[]
}

interface ParsedFile {
  readonly file: string
  readonly mocks: readonly ModuleMock[]
  readonly module: SourceModule
  readonly source: string
  readonly tests: readonly TestCall[]
}

interface MemberStep {
  readonly name: string
  readonly node: ESTree.Node
}

export const resolveModule = (
  from: string,
  specifier: string,
  { deleted, files }: Pick<Context, "deleted" | "files">,
): string | undefined => (deleted.has(specifier) ? specifier : resolveSourceFile(from, specifier, files))

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

const boundBy = (prune: Prune, declarator: ESTree.VariableDeclarator): ESTree.Node[] =>
  [...prune.module.bindings, ...prune.module.locals]
    .filter(({ declaration }) => declaration === declarator || isInside([declarator.id], declaration))
    .flatMap(({ references }) => references)

const markOf = ({ removed, targets, unprunable }: Prune): Mark => ({
  removed: removed.size,
  targets: targets.size,
  unprunable: unprunable.size,
})

const dropAfter = <Item>(items: Map<Item, unknown> | Set<Item>, size: number): void => {
  for (const item of [...items.keys()].slice(size)) {
    items.delete(item)
  }
}

const rollBack = (prune: Prune, mark: Mark): void => {
  dropAfter(prune.removed, mark.removed)
  dropAfter(prune.targets, mark.targets)
  dropAfter(prune.unprunable, mark.unprunable)
}

const takeUnit = (prune: Prune, target: ESTree.Node): boolean => {
  if (prune.targets.has(target)) {
    return true
  }

  const mark = markOf(prune)

  prune.targets.add(target)

  if (target.type === "ExportSpecifier") {
    prune.removed.add(nameOf(target.exported))
  }

  if (target.type === "VariableDeclarator" && !boundBy(prune, target).every((reference) => cut(prune, reference, reference))) {
    rollBack(prune, mark)

    return false
  }

  return true
}

const take = (prune: Prune, units: readonly ESTree.Node[]): boolean => units.some((unit) => takeUnit(prune, unit))

const cut = (prune: Prune, node: ESTree.Node, reported: ESTree.Node): boolean => {
  const taken = take(prune, unitOf(prune, node))

  if (!taken) {
    prune.unprunable.set(reported, node)
  }

  return taken
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

const isTaken = (prune: Prune, node: ESTree.Node): boolean =>
  [node, ...ancestorsOf(prune.module.parents, node)].some((ancestor) => prune.targets.has(ancestor))

const isDoomed = (prune: Prune, declaration: ESTree.Node): boolean => {
  const declarator = [declaration, ...ancestorsOf(prune.module.parents, declaration)].find(
    (node): node is ESTree.VariableDeclarator => node.type === "VariableDeclarator",
  )

  if (
    declarator === undefined ||
    prune.deciding.has(declarator) ||
    (declarator !== declaration && !isInside([declarator.id], declaration))
  ) {
    return false
  }

  prune.deciding.add(declarator)

  const doomed = isRemovableDeclarator(prune, declarator)

  prune.deciding.delete(declarator)

  return doomed
}

const isGoneDeclaration = (prune: Prune, declaration: ESTree.Node): boolean => isTaken(prune, declaration) || isDoomed(prune, declaration)

const isRemovedReference = (prune: Prune, binding: ModuleBinding, reference: ESTree.Node): boolean => {
  const owner = ownerOf(prune, binding)

  return (
    isGone(prune.context, owner.module, owner.path) ||
    isGoneDeclaration(prune, binding.declaration) ||
    goneMember(prune, owner, reference).length > 0
  )
}

const isDerived = (prune: Prune, node: ESTree.Node): boolean => {
  const ranges = [node]
  const fromModule = prune.module.bindings.flatMap((binding) =>
    binding.references.filter((reference) => isInside(ranges, reference)).map((reference) => isRemovedReference(prune, binding, reference)),
  )
  const fromScopes = prune.module.locals
    .filter(({ declaration }) => !isInside(ranges, declaration))
    .flatMap(({ declaration, references }) =>
      references.filter((reference) => isInside(ranges, reference)).map(() => isGoneDeclaration(prune, declaration)),
    )
  const references = [...fromModule, ...fromScopes]

  return references.length > 0 && references.every(Boolean)
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
        problemAt(prune, prune.module.program, `the removed features take away \`${name}\`, which ${prune.file} does not declare`),
      )
    }

    for (const property of properties) {
      prune.targets.add(property)
    }
  }
}

const pruneDynamicImports = (prune: Prune): void => {
  const mocked = new Set(prune.mocks.map(({ specifier }) => specifier))

  for (const { node, source } of prune.module.imports) {
    if (!mocked.has(node) && isGone(prune.context, resolveModule(prune.file, source, prune.context), [])) {
      const functions =
        node.type === "ImportExpression" ? ancestorsOf(prune.module.parents, node).filter((ancestor) => FUNCTIONS.has(ancestor.type)) : []
      const [nearest = node] = functions

      cut(prune, prune.callbacks.has(nearest) ? node : nearest, node)
    }
  }
}

const pruneMocks = (prune: Prune): void => {
  for (const { call, source, specifier } of prune.mocks) {
    if (isGone(prune.context, resolveModule(prune.file, source, prune.context), [])) {
      cut(prune, call, specifier)
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

const removedNodes = (prune: Prune, node: ESTree.Node): ESTree.Node[] =>
  childNodes(node).flatMap(([, child]) => (isRemoved(prune, child) ? [child] : removedNodes(prune, child)))

const isInside = (ranges: readonly ESTree.Node[], node: ESTree.Node): boolean =>
  ranges.some((range) => node.start >= range.start && node.end <= range.end)

const settleUnused = (prune: Prune): void => {
  const removed = removedNodes(prune, prune.module.program)
  const candidates = [
    ...prune.module.bindings.filter((binding) => binding.kind === BINDING_KIND.IMPORT || binding.removable),
    ...prune.module.locals.filter(({ removable }) => removable),
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

const strand = (prune: Prune, blocks: readonly ESTree.Node[]): void => {
  for (const block of blocks) {
    prune.stranded.add(block)
  }
}

const isEmptiedBlock = (removed: readonly ESTree.Node[], block: ESTree.Node): boolean =>
  block.type === "BlockStatement" &&
  block.body.length > 0 &&
  !isInside(removed, block) &&
  block.body.every((statement: ESTree.Node) => isInside(removed, statement))

const casesIn = (prune: Prune, { callbacks }: TestCall): TestCall[] =>
  prune.tests.filter(({ call, kind }) => kind === TEST_KIND.CASE && isInside(callbacks, call))

const isEmptiedTest = (prune: Prune, removed: readonly ESTree.Node[], test: TestCall): boolean => {
  const cases = test.kind === TEST_KIND.GROUP ? casesIn(prune, test) : []

  return (
    test.tables.some((table) => table.type === "ArrayExpression" && isEmptiedArray(prune, table)) ||
    test.callbacks.some(({ body }) => isEmptiedBlock(removed, body)) ||
    (cases.length > 0 && cases.every(({ call }) => isInside(removed, call)))
  )
}

const pruneEmptied = (prune: Prune): void => {
  const removed = removedNodes(prune, prune.module.program)

  for (const test of prune.tests.filter((candidate) => !isInside(removed, candidate.call) && isEmptiedTest(prune, removed, candidate))) {
    if (!take(prune, callUnit(prune, test))) {
      prune.emptied.add(test.call)
      strand(prune, [...test.callbacks.map(({ body }) => body), ...test.tables])
    }
  }

  const owners = prune.module.blocks.flatMap((block): [ESTree.Node, ESTree.Node][] => {
    const owner = prune.module.parents.get(block)

    return owner !== undefined && !prune.callbacks.has(owner) && isEmptiedBlock(removed, block) ? [[block, owner]] : []
  })

  strand(
    prune,
    owners.filter(([, owner]) => !take(prune, emptiedUnit(prune, owner))).map(([block]) => block),
  )
}

const retryUnprunable = (prune: Prune): void => {
  const attempts = new Map(prune.unprunable)

  prune.unprunable.clear()

  for (const [reported, node] of attempts) {
    cut(prune, node, reported)
  }
}

const settleSource = (prune: Prune): void => {
  const before = prune.targets.size

  retryUnprunable(prune)
  pruneEmptiedArrays(prune)
  pruneEmptied(prune)
  settleUnused(prune)

  if (prune.targets.size > before) {
    settleSource(prune)
  }
}

const textOf = (prune: Prune, node: ESTree.Node): string => prune.source.slice(node.start, node.end).replace(AFTER_FIRST_LINE, "")

const unprunableReason = (prune: Prune, node: ESTree.Node): string =>
  `\`${textOf(prune, node)}\` names what the removed features take away, and no array element, object property, JSX element, test, statement or declaration around it can go with it`

const emptiedReason = (prune: Prune, node: ESTree.Node): string =>
  `\`${textOf(prune, node)}\` is left empty once the code that names what the removed features take away goes, and it cannot go whole`

const isLeftWithoutCases = (prune: Prune, removed: readonly ESTree.Node[]): boolean => {
  const cases = prune.tests.filter(({ kind }) => kind === TEST_KIND.CASE)

  return isTestFile(prune.file) && cases.length > 0 && cases.every(({ call }) => isInside(removed, call))
}

const finish = (prune: Prune): FilePrune => {
  const removed = prune.targets.size > 0 ? removedNodes(prune, prune.module.program) : []
  const problems = [
    ...[...prune.unprunable.keys()]
      .filter((node) => !isInside(removed, node))
      .map((node) => problemAt(prune, node, unprunableReason(prune, node))),
    ...[...prune.emptied].filter((node) => !isInside(removed, node)).map((node) => problemAt(prune, node, emptiedReason(prune, node))),
  ]
  const deleted = isLeftWithoutCases(prune, removed)

  return {
    changed: prune.targets.size > 0,
    deleted,
    file: prune.file,
    problems: deleted ? [] : [...prune.problems, ...problems],
    removed: prune.removed,
    source: prune.targets.size > 0 ? applyEdits(prune.source, editsOf(prune, prune.module.program)) : prune.source,
  }
}

const pruneSource = (parsed: ParsedFile, context: Context, guarded: ReadonlySet<ESTree.Node>): FilePrune => {
  const { file, mocks, module, source, tests } = parsed
  const prune: Prune = {
    callbacks: new Map(tests.flatMap((test) => test.callbacks.map((callback): [ESTree.Node, TestCall] => [callback, test]))),
    context,
    deciding: new Set(),
    emptied: new Set(),
    file,
    guarded,
    isDerived: (node) => isDerived(prune, node),
    mocks,
    module,
    problems: [],
    removed: new Set(context.names),
    source,
    stranded: new Set(),
    targets: new Set(),
    tests,
    unprunable: new Map(),
  }

  pruneModuleStatements(prune)
  pruneBindings(prune)
  pruneNames(prune)
  pruneDynamicImports(prune)
  pruneMocks(prune)
  pruneNamespaces(prune)

  if (prune.targets.size > 0) {
    settleSource(prune)
  }

  const stranded = [...prune.stranded].filter((block) => !guarded.has(block))

  if (stranded.length > 0) {
    return pruneSource(parsed, context, new Set([...guarded, ...stranded]))
  }

  return finish(prune)
}

const pathCount = (paths: Paths): number => [...paths.values()].reduce((count, names) => count + names.size, 0)

const compareProblems = (left: PruneProblem, right: PruneProblem): number =>
  left.file.localeCompare(right.file) || left.line - right.line || left.column - right.column

const parse = (read: (file: string) => string, file: string): ParsedFile => {
  const source = read(file)
  const module = analyzeModule(file, source)

  return { file, mocks: moduleMocksOf(module), module, source, tests: testCallsOf(module) }
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
    const results = modules.map((parsed) =>
      pruneSource(parsed, { deleted, files, names: names.get(parsed.file) ?? [], namespaces, paths }, new Set()),
    )
    const discovered = results
      .filter(({ removed }) => removed.size > 0)
      .map(({ file, removed }): [string, ReadonlySet<string>] => [file, removed])
    const next = new Map([...paths, ...discovered])

    return pathCount(next) > pathCount(paths) ? settle(next) : results
  }
  const results = settle(new Map([...names].map(([file, list]) => [file, new Set(list)])))

  return {
    deleted: new Set(results.filter((result) => result.deleted).map(({ file }) => file)),
    problems: results.flatMap(({ problems }) => problems).toSorted(compareProblems),
    sources: new Map(results.filter((result) => result.changed && !result.deleted).map(({ file, source }) => [file, source])),
  }
}
