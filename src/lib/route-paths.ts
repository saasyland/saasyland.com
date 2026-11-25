import { ROUTES } from "~/src/routes"

const KEY_SEPARATOR = "."

interface RouteTree {
  readonly [key: string]: RouteTree | string
}

type RouteEntry = readonly [name: string, path: string]

const entriesOf = (tree: RouteTree, prefix: string): RouteEntry[] =>
  Object.entries(tree).flatMap(([key, value]): RouteEntry[] => {
    const name = `${prefix}${key}`

    return typeof value === "string" ? [[name, value]] : entriesOf(value, `${name}${KEY_SEPARATOR}`)
  })

export const ROUTE_PATHS: ReadonlyMap<string, string> = new Map(entriesOf(ROUTES, ""))
