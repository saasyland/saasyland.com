import type { Statements } from "better-auth/plugins/access"

import type { Role } from "~/src/integrations/better-auth/auth.roles"

import * as AREA_ACCESS from "~/src/data/access.entries"

export interface AreaAccess {
  readonly grants: Readonly<Partial<Record<Role, Statements>>>
  readonly statements: Statements
}

type Intersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (value: infer All) => void ? All : never

type AppStatements = Intersection<(typeof AREA_ACCESS)[keyof typeof AREA_ACCESS]["statements"]>

const AREAS: readonly AreaAccess[] = Object.values(AREA_ACCESS)

const merge = (parts: readonly Statements[]): Statements =>
  Object.fromEntries(parts.flatMap((part) => Object.entries(part)).toSorted(([first], [second]) => first.localeCompare(second)))

const holdsEveryArea = (statements: Statements): statements is AppStatements =>
  AREAS.every((area) => Object.entries(area.statements).every(([resource, actions]) => statements[resource] === actions))

const appStatements = (): AppStatements => {
  const statements = merge(AREAS.map((area) => area.statements))

  if (!holdsEveryArea(statements)) {
    throw new Error("Two areas declare the same access statement.")
  }

  return statements
}

export const APP_STATEMENTS = appStatements()

export const grantsOf = (role: Role): Statements => merge(AREAS.map(({ grants }) => grants[role] ?? {}))
