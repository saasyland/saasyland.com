import { globSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import type { ESTree } from "vite/rolldown/utils"

import { BINDING_KIND, type ModuleBinding, type SourceModule, analyzeModule } from "~/scripts/module-bindings"

const ROUTER_PACKAGES = new Set(["@tanstack/react-router", "@tanstack/router-core"])
const SERVER_FUNCTION_FACTORY = "createServerFn("

const CALLER = {
  DIRECT: "a direct call",
  MUTATION_FUNCTION: "mutationFn",
  QUERY_FUNCTION: "queryFn",
  USE_SERVER_FN: "useServerFn",
} as const

const HANDLED_BY = new Map<string, ReadonlySet<string>>([
  ["notFound", new Set([CALLER.QUERY_FUNCTION])],
  ["redirect", new Set([CALLER.MUTATION_FUNCTION, CALLER.QUERY_FUNCTION, CALLER.USE_SERVER_FN])],
])

const QUERY_CALLERS = new Set<string>([CALLER.MUTATION_FUNCTION, CALLER.QUERY_FUNCTION])

const SOURCE_FILES = "src/**/*.{ts,tsx}"
const SKIPPED_SOURCES = /__test__|\.test\.|src\/platform\/testing\/|routeTree\.gen\.ts|\.d\.ts$/u

interface Source {
  readonly module: SourceModule
  readonly path: string
  readonly text: string
}

const analyze = ([path, text]: readonly [string, string]): Source => ({ module: analyzeModule(path, text), path, text })

const controlFlowImports = ({ module }: Source): string[] =>
  module.bindings
    .filter((binding) => binding.kind === BINDING_KIND.IMPORT && ROUTER_PACKAGES.has(binding.source))
    .flatMap(({ path }) => path)
    .filter((name) => HANDLED_BY.has(name))

const isServerFunction = ({ declaration, kind }: ModuleBinding, text: string): boolean =>
  kind === BINDING_KIND.LOCAL &&
  declaration.type === "VariableDeclarator" &&
  declaration.init !== null &&
  text.slice(declaration.init.start, declaration.init.end).startsWith(SERVER_FUNCTION_FACTORY)

const serverFunctions = (source: Source): (readonly [string, string[]])[] =>
  source.module.bindings
    .filter((binding) => isServerFunction(binding, source.text))
    .map(({ name }) => [name, controlFlowImports(source)] as const)

const callerOf = (node: ESTree.Node, parents: ReadonlyMap<ESTree.Node, ESTree.Node>): string => {
  const parent = parents.get(node)
  if (parent?.type === "CallExpression" && parent.callee.type === "Identifier" && parent.callee.name === CALLER.USE_SERVER_FN) {
    return CALLER.USE_SERVER_FN
  }
  for (let ancestor = parent; ancestor !== undefined; ancestor = parents.get(ancestor)) {
    if (ancestor.type === "Property" && ancestor.key.type === "Identifier" && QUERY_CALLERS.has(ancestor.key.name)) {
      return ancestor.key.name
    }
  }

  return CALLER.DIRECT
}

const lineOf = (text: string, { start }: ESTree.Node): number => text.slice(0, start).split("\n").length

const unhandledServerFunctionUses = (files: ReadonlyMap<string, string>): string[] => {
  const throwing = new Map(
    [...files]
      .filter(([, text]) => text.includes(SERVER_FUNCTION_FACTORY) && [...ROUTER_PACKAGES].some((name) => text.includes(name)))
      .flatMap((entry) => serverFunctions(analyze(entry)))
      .filter(([, thrown]) => thrown.length > 0),
  )
  const callers = [...files].filter(([, text]) => [...throwing.keys()].some((name) => text.includes(name))).map((entry) => analyze(entry))

  return callers.flatMap(({ module, path, text }) =>
    module.bindings.flatMap(({ path: [name = ""], references }) =>
      references.flatMap((reference) => {
        const caller = callerOf(reference, module.parents)

        return (throwing.get(name) ?? [])
          .filter((thrown) => HANDLED_BY.get(thrown)?.has(caller) !== true)
          .map(
            (thrown) =>
              `${path}:${String(lineOf(text, reference))}: ${name} throws ${thrown}() and reaches ${caller}, which does not handle it`,
          )
      }),
    ),
  )
}

const REDIRECTING = `import { redirect } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

export const leave = createServerFn().handler(() => {
  throw redirect({ to: "/" })
})
`

const MISSING = `import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

export const find = createServerFn().handler(() => {
  throw notFound()
})
`

const PLAIN = `import { createServerFn } from "@tanstack/react-start"

export const read = createServerFn().handler(() => 1)
`

const withCaller = (caller: string): Map<string, string> =>
  new Map([
    ["missing.ts", MISSING],
    ["plain.ts", PLAIN],
    ["redirecting.ts", REDIRECTING],
    [
      "caller.tsx",
      `import { find } from "./missing"\nimport { read } from "./plain"\nimport { leave } from "./redirecting"\n\n${caller}\n`,
    ],
  ])

describe("unhandledServerFunctionUses", () => {
  it.each([
    ["a query function", "queryOptions({ queryFn: () => leave(), queryKey: [] })"],
    ["a mutation function", "mutationOptions({ mutationFn: () => leave() })"],
    ["useServerFn", "const Leave = () => useServerFn(leave)"],
    ["a query function, when it throws notFound", "queryOptions({ queryFn: () => find(), queryKey: [] })"],
    ["a direct call, when it throws neither", "const one = await read()"],
  ])("accepts a server function reached through %s", (_, caller) => {
    expect(unhandledServerFunctionUses(withCaller(caller))).toStrictEqual([])
  })

  it.each([
    ["a direct call that throws redirect", "const onClick = () => leave()", "leave throws redirect() and reaches a direct call"],
    ["useServerFn, which handles no notFound", "const Find = () => useServerFn(find)", "find throws notFound() and reaches useServerFn"],
    [
      "a mutation function, which handles no notFound",
      "mutationOptions({ mutationFn: () => find() })",
      "find throws notFound() and reaches mutationFn",
    ],
  ])("reports %s", (_, caller, report) => {
    expect(unhandledServerFunctionUses(withCaller(caller))).toStrictEqual([`caller.tsx:5: ${report}, which does not handle it`])
  })
})

it("lets no server function throw redirect() or notFound() where its caller cannot handle it", () => {
  const files = new Map(
    globSync(SOURCE_FILES)
      .filter((path) => !SKIPPED_SOURCES.test(path))
      .map((path) => [path, readFileSync(path, "utf8")] as const),
  )

  expect(unhandledServerFunctionUses(files)).toStrictEqual([])
})
