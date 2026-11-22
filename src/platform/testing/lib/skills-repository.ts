import { createContentDirectory } from "~/src/platform/testing/lib/content-directory"

import { BUN_LOCK, PACKAGE_JSON } from "~/scripts/dependencies"
import { type LockedSkill, SKILLS_LOCK, SKILL_PACKAGES } from "~/scripts/skills-lock"

export interface RepositoryOptions {
  readonly dependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
  readonly files?: Readonly<Record<string, string>>
  readonly recorded?: Readonly<Record<string, string>>
  readonly resolved?: Readonly<Record<string, string>>
  readonly skills?: Readonly<Record<string, LockedSkill>>
}

const JSON_INDENT = 2

const bunLock = (resolved: Readonly<Record<string, string>>): string =>
  `{\n  "lockfileVersion": 1,\n  "packages": {\n${Object.entries(resolved)
    .map(([name, entry]) => `    ${JSON.stringify(name)}: [${JSON.stringify(entry)}, "", {}, "sha512-test"],`)
    .join("\n")}\n  },\n}\n`

export const createSkillsRepository = ({
  dependencies = {},
  devDependencies = {},
  files = {},
  recorded,
  resolved = {},
  skills = {},
}: RepositoryOptions): string =>
  createContentDirectory({
    [BUN_LOCK]: bunLock(resolved),
    [PACKAGE_JSON]: JSON.stringify({ dependencies, devDependencies }),
    [SKILLS_LOCK]: JSON.stringify({ skills, version: 2 }, undefined, JSON_INDENT),
    ...(recorded === undefined ? {} : { [SKILL_PACKAGES]: JSON.stringify(recorded) }),
    ...files,
  })
