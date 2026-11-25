export interface SkillSource {
  readonly group: string
  readonly packages: readonly string[]
}

export const TANSTACK_ROUTER = "TanStack/router"

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
