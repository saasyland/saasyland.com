import type { ESTree } from "vite/rolldown/utils"

import { isNode } from "./module-bindings.ts"

export interface EditScope {
  readonly source: string
  readonly targets: ReadonlySet<ESTree.Node>
}

interface Edit {
  readonly end: number
  readonly start: number
  readonly text: string
}

interface Neighbours {
  readonly holes: boolean
  readonly keptAfter: boolean
  readonly keptBefore: boolean
  readonly keptPrevious: boolean
  readonly next: ESTree.Node | undefined
  readonly previous: ESTree.Node | undefined
}

export const LINE_BREAK = "\n"

const TRAILING_SEPARATOR = /^\s*[,;]/u
const TYPE_KIND = "type"
const SPECIFIERS = "specifiers"
const ARRAY_PATTERN = "ArrayPattern"

export const isRemoved = (scope: EditScope, node: ESTree.Node): boolean => scope.targets.has(node) || isEmptied(scope, node)

const allRemoved = (scope: EditScope, nodes: readonly ESTree.Node[]): boolean =>
  nodes.length > 0 && nodes.every((node) => isRemoved(scope, node))

const isEmptiedPattern = (scope: EditScope, node: ESTree.Node): boolean => {
  if (node.type === "ObjectPattern") {
    return allRemoved(scope, node.properties)
  }

  if (node.type !== "ArrayPattern") {
    return false
  }

  return allRemoved(
    scope,
    node.elements.filter((element) => element !== null),
  )
}

const isEmptied = (scope: EditScope, node: ESTree.Node): boolean => {
  if (node.type === "ImportDeclaration") {
    return allRemoved(scope, node.specifiers)
  }

  if (node.type === "ExportNamedDeclaration") {
    return node.declaration === null ? allRemoved(scope, node.specifiers) : isRemoved(scope, node.declaration)
  }

  if (node.type === "ExportDefaultDeclaration") {
    return isRemoved(scope, node.declaration)
  }

  if (node.type === "VariableDeclaration") {
    return allRemoved(scope, node.declarations)
  }

  if (node.type === "VariableDeclarator") {
    return isEmptiedPattern(scope, node.id)
  }

  return isEmptiedPattern(scope, node.type === "Property" ? node.value : node)
}

const childGroups = (node: ESTree.Node): ESTree.Node[][] =>
  Object.entries(node).flatMap(([key, value]: [string, unknown]) => {
    const values: unknown[] = Array.isArray(value) ? value : [value]
    const nodes = values.filter((child) => isNode(child))

    return key === SPECIFIERS || nodes.length === 0 ? [] : [nodes]
  })

const lineBreaks = (scope: EditScope, start: number, end: number): number => scope.source.slice(start, end).split(LINE_BREAK).length

const keepsGapAfter = (scope: EditScope, item: ESTree.Node, [previous, next]: readonly [ESTree.Node, ESTree.Node]): boolean =>
  lineBreaks(scope, item.end, next.start) > lineBreaks(scope, previous.end, item.start)

const removal = (scope: EditScope, item: ESTree.Node, { holes, keptAfter, keptBefore, keptPrevious, next, previous }: Neighbours): Edit => {
  if (keptAfter && next !== undefined && holes) {
    return { end: item.end, start: item.start, text: "" }
  }

  if (keptAfter && next !== undefined && keptPrevious && previous !== undefined && keepsGapAfter(scope, item, [previous, next])) {
    return { end: item.end, start: previous.end, text: "" }
  }

  if (keptAfter && next !== undefined) {
    return { end: next.start, start: item.start, text: "" }
  }

  const separator = next === undefined && !keptBefore ? (TRAILING_SEPARATOR.exec(scope.source.slice(item.end))?.[0].length ?? 0) : 0

  return { end: item.end + separator, start: previous?.end ?? item.start, text: "" }
}

const kindPrefix = (kind: string | undefined): string => (kind === TYPE_KIND ? `${TYPE_KIND} ` : "")

const importText = (scope: EditScope, node: ESTree.ImportDeclaration): string => {
  const kept = node.specifiers.filter((specifier) => !scope.targets.has(specifier))
  const named = kept.flatMap((specifier) =>
    specifier.type === "ImportSpecifier" ? [scope.source.slice(specifier.start, specifier.end)] : [],
  )
  const clauses = [
    ...kept.flatMap((specifier) => (specifier.type === "ImportDefaultSpecifier" ? [specifier.local.name] : [])),
    ...kept.flatMap((specifier) => (specifier.type === "ImportNamespaceSpecifier" ? [`* as ${specifier.local.name}`] : [])),
    ...(named.length > 0 ? [`{ ${named.join(", ")} }`] : []),
  ]

  return `import ${kindPrefix(node.importKind)}${clauses.join(", ")} from `
}

const exportText = (scope: EditScope, node: ESTree.ExportNamedDeclaration): string => {
  const kept = node.specifiers.filter((specifier) => !scope.targets.has(specifier)).map(({ end, start }) => scope.source.slice(start, end))

  return `export ${kindPrefix(node.exportKind)}{ ${kept.join(", ")} }${node.source === null ? "" : " from "}`
}

const specifierEdits = (scope: EditScope, node: ESTree.Node): Edit[] => {
  if (node.type === "ImportDeclaration" && node.specifiers.some((specifier) => scope.targets.has(specifier))) {
    return [{ end: node.source.start, start: node.start, text: importText(scope, node) }]
  }

  if (node.type === "ExportNamedDeclaration" && node.specifiers.some((specifier) => scope.targets.has(specifier))) {
    return [{ end: node.source?.start ?? node.end, start: node.start, text: exportText(scope, node) }]
  }

  return []
}

const itemEdits = (scope: EditScope, item: ESTree.Node, neighbours: Neighbours): Edit[] =>
  isRemoved(scope, item) ? [removal(scope, item, neighbours)] : editsOf(scope, item)

const listEdits = (scope: EditScope, items: readonly ESTree.Node[], holes: boolean): Edit[] => {
  const removed = items.map((item) => isRemoved(scope, item))

  return items.flatMap((item, index) =>
    itemEdits(scope, item, {
      holes,
      keptAfter: removed.slice(index + 1).includes(false),
      keptBefore: removed.slice(0, index).includes(false),
      keptPrevious: removed[index - 1] === false,
      next: items[index + 1],
      previous: items[index - 1],
    }),
  )
}

export const editsOf = (scope: EditScope, node: ESTree.Node): Edit[] => [
  ...specifierEdits(scope, node),
  ...childGroups(node).flatMap((items) => listEdits(scope, items, node.type === ARRAY_PATTERN)),
]

export const applyEdits = (source: string, edits: readonly Edit[]): string =>
  edits
    .toSorted((left, right) => right.start - left.start)
    .reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, source)
