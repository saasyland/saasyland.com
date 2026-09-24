export const SCAFFOLD_DIR = "my-app"

export const SCAFFOLD_TARGET = `saasyland@latest init ${SCAFFOLD_DIR}`

export const PACKAGE_MANAGERS = [
  { dev: "bun dev", exec: "bunx", id: "bun" },
  { dev: "npm run dev", exec: "npx", id: "npm" },
  { dev: "pnpm dev", exec: "pnpm dlx", id: "pnpm" },
  { dev: "yarn dev", exec: "yarn dlx", id: "yarn" },
] as const

export const CLI_GROUPS = ["platform", "data", "product", "extras"] as const

export const CLI_CHOICES = [
  {
    group: "platform",
    id: "framework",
    options: [
      {
        flag: "--framework tanstack",
        id: "tanstack",
        labelKey: "choices.framework.options.tanstack",
      },
      {
        flag: "--framework next",
        id: "next",
        labelKey: "choices.framework.options.next",
      },
      {
        flag: "--framework react-router",
        id: "react-router",
        labelKey: "choices.framework.options.react-router",
      },
    ],
  },
  {
    group: "platform",
    id: "architecture",
    options: [
      {
        flag: "--arch monolith",
        id: "monolith",
        labelKey: "choices.architecture.options.monolith",
      },
      {
        flag: "--arch split",
        id: "split",
        labelKey: "choices.architecture.options.split",
      },
      {
        flag: "--arch microservices",
        id: "microservices",
        labelKey: "choices.architecture.options.microservices",
      },
    ],
  },
  {
    group: "platform",
    id: "deployment",
    options: [
      {
        flag: "--deploy cloudflare",
        id: "cloudflare",
        labelKey: "choices.deployment.options.cloudflare",
      },
      {
        flag: "--deploy vercel",
        id: "vercel",
        labelKey: "choices.deployment.options.vercel",
      },
      {
        flag: "--deploy self",
        id: "self",
        labelKey: "choices.deployment.options.self",
      },
    ],
  },
  {
    group: "platform",
    id: "api",
    options: [
      {
        flag: "--api hono",
        id: "hono",
        labelKey: "choices.api.options.hono",
        visibleWhen: {
          architecture: ["split", "microservices"],
        },
      },
      {
        flag: "--api elysia",
        id: "elysia",
        labelKey: "choices.api.options.elysia",
        unavailableKey: "choices.api.unavailable.elysia",
        unavailableWhen: {
          deployment: ["cloudflare"],
        },
        visibleWhen: {
          architecture: ["split", "microservices"],
        },
      },
    ],
  },
  {
    group: "platform",
    id: "runtime",
    options: [
      {
        flag: "--runtime node",
        id: "node",
        labelKey: "choices.runtime.options.node",
      },
      {
        flag: "--runtime bun",
        id: "bun",
        labelKey: "choices.runtime.options.bun",
        unavailableKey: "choices.runtime.unavailable.bun",
        unavailableWhen: {
          deployment: ["cloudflare"],
        },
      },
    ],
  },
  {
    group: "data",
    id: "database",
    options: [
      {
        flag: "--db sqlite",
        id: "sqlite",
        labelKey: "choices.database.options.sqlite",
        unavailableKey: "choices.database.unavailable.sqlite",
        unavailableWhen: {
          deployment: ["vercel"],
        },
      },
      {
        flag: "--db postgres",
        id: "postgres",
        labelKey: "choices.database.options.postgres",
      },
    ],
  },
  {
    group: "data",
    id: "provider",
    options: [
      {
        flag: "--provider neon",
        id: "neon",
        labelKey: "choices.provider.options.neon",
        visibleWhen: {
          database: ["postgres"],
        },
      },
      {
        flag: "--provider supabase",
        id: "supabase",
        labelKey: "choices.provider.options.supabase",
        visibleWhen: {
          database: ["postgres"],
        },
      },
      {
        flag: "--provider self",
        id: "self-postgres",
        labelKey: "choices.provider.options.self-postgres",
        visibleWhen: {
          database: ["postgres"],
        },
      },
      {
        flag: "--provider d1",
        id: "d1",
        labelKey: "choices.provider.options.d1",
        unavailableKey: "choices.provider.unavailable.d1",
        unavailableWhen: {
          deployment: ["self"],
        },
        visibleWhen: {
          database: ["sqlite"],
        },
      },
      {
        flag: "--provider turso",
        id: "turso",
        labelKey: "choices.provider.options.turso",
        visibleWhen: {
          database: ["sqlite"],
        },
      },
      {
        flag: "--provider file",
        id: "file",
        labelKey: "choices.provider.options.file",
        unavailableKey: "choices.provider.unavailable.file",
        unavailableWhen: {
          deployment: ["cloudflare"],
        },
        visibleWhen: {
          database: ["sqlite"],
        },
      },
    ],
  },
  {
    group: "data",
    id: "orm",
    options: [
      {
        flag: "--orm drizzle",
        id: "drizzle",
        labelKey: "choices.orm.options.drizzle",
      },
      {
        flag: "--orm prisma",
        id: "prisma",
        labelKey: "choices.orm.options.prisma",
      },
    ],
  },
  {
    group: "product",
    id: "tenancy",
    options: [
      {
        flag: "--tenancy single",
        id: "single",
        labelKey: "choices.tenancy.options.single",
      },
      {
        flag: "--tenancy multi",
        id: "multi",
        labelKey: "choices.tenancy.options.multi",
      },
    ],
  },
  {
    group: "product",
    id: "auth",
    options: [
      {
        flag: "--auth better-auth",
        id: "better-auth",
        labelKey: "choices.auth.options.better-auth",
      },
      {
        flag: "--no-auth",
        id: "none",
        labelKey: "choices.auth.options.none",
      },
    ],
  },
  {
    group: "product",
    id: "email",
    options: [
      {
        flag: "--email resend",
        id: "resend",
        labelKey: "choices.email.options.resend",
      },
      {
        flag: "--email plunk",
        id: "plunk",
        labelKey: "choices.email.options.plunk",
      },
      {
        flag: "--no-email",
        id: "none",
        labelKey: "choices.email.options.none",
      },
    ],
  },
  {
    group: "product",
    id: "billing",
    options: [
      {
        flag: "--billing polar",
        id: "polar",
        labelKey: "choices.billing.options.polar",
      },
      {
        flag: "--billing stripe",
        id: "stripe",
        labelKey: "choices.billing.options.stripe",
      },
      {
        flag: "--billing lemonsqueezy",
        id: "lemonsqueezy",
        labelKey: "choices.billing.options.lemonsqueezy",
      },
      {
        flag: "--no-billing",
        id: "none",
        labelKey: "choices.billing.options.none",
      },
    ],
  },
  {
    group: "product",
    id: "content",
    options: [
      {
        flag: "--content mdx",
        id: "mdx",
        labelKey: "choices.content.options.mdx",
      },
      {
        flag: "--no-content",
        id: "none",
        labelKey: "choices.content.options.none",
      },
    ],
  },
] as const

export const CLI_EXTRAS = [
  { flag: "--with commerce", id: "commerce", module: "commerce", unavailableWhen: { billing: ["none"] } },
  { flag: "--with courses", id: "courses", module: "courses", unavailableWhen: { billing: ["none"] } },
  { flag: "--with page-builder", id: "page-builder", module: "builder" },
  { flag: "--with post-editor", id: "post-editor", module: "editor", unavailableWhen: { content: ["none"] } },
] as const

export const NONE = "none"

export const CLI_MODULES = [
  { choiceId: "auth", id: "auth" },
  { id: "database" },
  { choiceId: "billing", id: "billing" },
  { choiceId: "email", id: "email" },
  { id: "admin" },
  { id: "ui" },
  { id: "i18n" },
  { choiceId: "content", id: "content" },
  { id: "tests" },
  { id: "tooling" },
] as const
