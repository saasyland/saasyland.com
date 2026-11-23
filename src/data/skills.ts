export interface SkillSource {
  readonly group: string
  readonly packages: readonly string[]
}

const TANSTACK_ROUTER = "TanStack/router"

export const SKILL_SOURCES = {
  "Leonxlnx/taste-skill": { group: "taste", packages: [] },
  [TANSTACK_ROUTER]: { group: "tanstack/router", packages: ["@tanstack/react-router", "@tanstack/react-start"] },
  "TanStack/table": { group: "tanstack/table", packages: ["@tanstack/react-table"] },
  "anthropics/skills": { group: "anthropic", packages: [] },
  "better-auth/skills": { group: "better-auth", packages: ["better-auth"] },
  "cloudflare/skills": { group: "cloudflare", packages: ["@cloudflare/vite-plugin", "wrangler"] },
  "coreyhaines31/marketingskills": { group: "coreyhaines31", packages: [] },
  "mattpocock/skills": { group: "matt-pocock", packages: [] },
  "pbakaus/impeccable": { group: "impeccable", packages: [] },
  "polarsource/skills": { group: "polar", packages: ["@polar-sh/*"] },
  "remotion-dev/skills": { group: "remotion", packages: [] },
  "resend/resend-skills": { group: "resend", packages: ["react-email", "resend"] },
} as const satisfies Record<string, SkillSource>

const TANSTACK_START_GROUP = "tanstack/start"
const TANSTACK_START_SKILL_PATH = /^packages\/(?:react-start|start-[^/]+)\//u

const SKILL_GROUPS = new Map<string, string>(Object.entries(SKILL_SOURCES).map(([source, { group }]) => [source, group]))

export const isSkillSource = (source: string): source is keyof typeof SKILL_SOURCES => SKILL_GROUPS.has(source)

export const skillGroup = ({ skillPath, source }: { readonly skillPath: string; readonly source: string }): string | undefined => {
  if (source === TANSTACK_ROUTER && TANSTACK_START_SKILL_PATH.test(skillPath)) {
    return TANSTACK_START_GROUP
  }

  return SKILL_GROUPS.get(source)
}

const WILDCARD = "*"
const SCOPE_WILDCARD = `/${WILDCARD}`

export const matchesPackage = (pattern: string, name: string): boolean =>
  pattern.endsWith(SCOPE_WILDCARD) ? name.startsWith(pattern.replace(WILDCARD, "")) : name === pattern
