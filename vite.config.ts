import { resolve } from "node:path"
import { type UserConfig, defineConfig, lazyPlugins, loadEnv } from "vite-plus"

import { LOCAL_SERVER } from "./src/data/local-server.ts"
import { vitePlugins } from "./src/data/vite.ts"

const projectRoot = import.meta.dirname

const ignorePatterns = [
  "**/*.d.ts",
  "**/*.tsbuildinfo",
  ".agents",
  "remotion",
  ".claude",
  ".source",
  ".tanstack",
  ".vscode",
  ".wrangler",
  "blob-report",
  "coverage",
  "dist",
  "e2e",
  "node_modules",
  "playwright-report",
  "playwright/.cache",
  "src/integrations/**/*.d.json.ts",
  "src/integrations/**/migrations/**",
  "src/routeTree.gen.ts",
  "src/types/worker-configuration.d.ts",
  "test-results",
]

const undefinedBranchBacklog = [
  "src/presentation/components/custom/app/course-unlocks.tsx",
  "src/presentation/components/custom/app/upgrade-offer.tsx",
]

const tooling = {
  fmt: {
    arrowParens: "always",
    bracketSpacing: true,
    endOfLine: "lf",
    ignorePatterns,
    jsxSingleQuote: false,
    printWidth: 140,
    semi: false,
    singleQuote: false,
    sortImports: {
      customGroups: [
        {
          elementNamePattern: ["@tanstack/react-start/server-only"],
          groupName: "server-only",
        },
        {
          elementNamePattern: ["cloudflare:workers"],
          groupName: "cloudflare",
        },
        {
          elementNamePattern: ["~/src/presentation/components/shadcn/**"],
          groupName: "components-shadcn",
        },
        {
          elementNamePattern: ["~/src/presentation/components/custom/**"],
          groupName: "components-custom",
        },
        {
          elementNamePattern: ["~/src/presentation/components/**"],
          groupName: "components-other",
        },
        {
          elementNamePattern: ["~/src/presentation/branding/**"],
          groupName: "branding",
        },
        {
          elementNamePattern: [
            "~/src/areas",
            "~/src/areas/**",
            "~/src/constants",
            "~/src/constants/**",
            "~/src/data",
            "~/src/data/**",
            "~/src/presentation/theme",
            "~/src/presentation/theme/**",
          ],
          groupName: "constants",
        },
        {
          elementNamePattern: ["~/src/hooks/**"],
          groupName: "hooks",
        },
        {
          elementNamePattern: ["~/src/integrations/**"],
          groupName: "integrations",
        },
        {
          elementNamePattern: ["~/src/lib/**"],
          groupName: "lib",
        },
        {
          elementNamePattern: ["~/src/modules/**"],
          groupName: "modules",
        },
        {
          elementNamePattern: ["~/src/platform/**"],
          groupName: "platform",
        },
        {
          elementNamePattern: ["~/src/providers/**"],
          groupName: "providers",
        },
        {
          elementNamePattern: ["react", "react/**", "react-dom", "react-dom/**"],
          groupName: "react",
        },
        {
          elementNamePattern: ["~/src/routes/**"],
          groupName: "routes",
        },
        {
          elementNamePattern: ["~/src/presentation/styles/**"],
          groupName: "styles",
        },
        {
          elementNamePattern: ["~/src/types/**"],
          groupName: "types",
        },
      ],
      groups: [
        "server-only",
        "cloudflare",
        "react",
        ["builtin", "external"],
        "platform",
        "providers",
        "integrations",
        "modules",
        "routes",
        "hooks",
        "constants",
        "types",
        "lib",
        "branding",
        "components-shadcn",
        "components-custom",
        "components-other",
        "styles",
        ["internal", "parent", "sibling", "index"],
        "unknown",
      ],
      ignoreCase: true,
      newlinesBetween: true,
      sortSideEffects: true,
    },
    sortPackageJson: { sortScripts: true },
    sortTailwindcss: {
      attributes: ["className", "classList"],
      functions: ["clsx", "cn", "cva", "tw"],
      stylesheet: "./src/presentation/styles/globals.css",
    },
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
  },
  lint: {
    categories: {
      correctness: "error",
      nursery: "error",
      pedantic: "error",
      perf: "error",
      style: "error",
      suspicious: "error",
    },
    env: { browser: true, es2024: true, node: true, worker: true },
    globals: { HTMLRewriter: "readonly", caches: "readonly" },
    ignorePatterns,
    jsPlugins: [
      "./scripts/admin-data-lint-plugin.ts",
      "./scripts/code-style-lint-plugin.ts",
      "./scripts/hydration-lint-plugin.ts",
      "./scripts/radius-lint-plugin.ts",
      "./scripts/type-lint-plugin.ts",
    ],
    options: {
      respectEslintDisableDirectives: false,
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ["src/hooks/**", "src/presentation/**", "src/providers/**", "src/routes/*.tsx"],
        rules: { "hydration/no-clock-or-locale-in-render": "error" },
      },
      {
        files: ["src/**"],
        rules: { "radius/no-off-scale": "error", "type/mono-for-code": "error", "type/no-off-scale": "error" },
      },
      {
        files: ["src/presentation/social-card.tsx"],
        rules: { "type/no-off-scale": "off" },
      },
      {
        files: ["src/data/admin*.ts", "src/data/*.dashboard.ts", "src/presentation/components/custom/admin/**", "src/routes/admin*.tsx"],
        rules: { "admin-data/no-literal-data": "error" },
      },
      {
        files: ["src/**/*.test.{ts,tsx}", "src/**/__test__/**", "src/platform/testing/**"],
        rules: {
          "admin-data/no-literal-data": "off",
          "hydration/no-clock-or-locale-in-render": "off",
          "no-await-in-loop": "off",
          "no-magic-numbers": "off",
          "radius/no-off-scale": "off",
          "type/mono-for-code": "off",
          "type/no-off-scale": "off",
          "unicorn/no-null": "off",
        },
      },
      {
        files: ["src/presentation/**", "src/hooks/**"],
        rules: { "typescript/consistent-return": "off" },
      },
      {
        files: ["src/platform/testing/mocks/**"],
        rules: { "require-await": "off", "typescript/require-await": "off" },
      },
      {
        files: ["src/routes/**"],
        rules: { "sort-keys": "off" },
      },
      {
        files: undefinedBranchBacklog,
        rules: { "code-style/no-undefined-branch": "off" },
      },
    ],
    rules: {
      "capitalized-comments": "off",
      "code-style/no-comments": "error",
      "code-style/no-multiline-ternary": "error",
      "code-style/no-undefined-branch": "error",
      "code-style/no-undefined-fallback": "error",
      "code-style/zod-namespace-import": "error",
      "id-length": ["error", { exceptions: ["_", "m", "t"], properties: "never" }],
      "max-lines": ["error", { max: 800 }],
      "max-lines-per-function": ["error", { max: 150 }],
      "max-statements": ["error", { max: 20 }],
      "new-cap": ["error", { properties: false }],
      "no-inline-comments": "off",
      "no-magic-numbers": ["error", { ignore: [0, 1], ignoreArrayIndexes: true, ignoreDefaultValues: true, ignoreTypeIndexes: true }],
      "no-ternary": "off",
      "no-underscore-dangle": ["error", { allow: ["_splat", "__executeServer"] }],
      "no-warning-comments": "off",
      "one-var": ["error", "never"],
      "sort-imports": ["error", { ignoreDeclarationSort: true }],
      "typescript/ban-ts-comment": ["error", { "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true }],
      "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "typescript/no-explicit-any": "error",
      "typescript/only-throw-error": [
        "error",
        {
          allow: [
            { from: "package", name: "NotFoundError", package: "@tanstack/router-core" },
            { from: "package", name: "Redirect", package: "@tanstack/router-core" },
          ],
        },
      ],
      "typescript/prefer-readonly-parameter-types": "off",
      "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
    },
  },
} satisfies Pick<UserConfig, "fmt" | "lint">

export default defineConfig(({ mode }) => ({
  ...tooling,
  plugins: lazyPlugins(() => vitePlugins({ mode, vitest: process.env["VITEST"] === "true" })) ?? [],
  preview: { host: LOCAL_SERVER.HOST, port: LOCAL_SERVER.PORT },
  resolve: { tsconfigPaths: true },
  server: { port: LOCAL_SERVER.PORT, strictPort: true, watch: { ignored: ["**/coverage/**"] } },
  staged: { "*": "vp check --fix" },
  test: {
    alias: [
      { find: "cloudflare:workers", replacement: resolve(projectRoot, "src/platform/testing/mocks/cloudflare.ts") },
      {
        find: /^@wrksz\/themes(?:\/client(?:\/extended-provider)?)?$/u,
        replacement: resolve(projectRoot, "src/platform/testing/mocks/wrksz-themes.ts"),
      },
    ],
    coverage: {
      clean: true,
      exclude: [
        "**/*.{test,spec}.{ts,tsx}",
        "**/__test__/**",
        "**/*.d.ts",
        "src/routeTree.gen.ts",
        "src/presentation/components/shadcn/**",
        "src/integrations/use-intl/*.d.json.ts",
        "src/platform/testing/**",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    deps: {
      interopDefault: true,
    },
    env: loadEnv("test", projectRoot, ""),
    environment: "node",
    exclude: ["node_modules/**", "dist/**", "build/**", "e2e/**", "src/integrations/drizzle-orm/migrations/**"],
    globals: true,
    isolate: true,
    passWithNoTests: false,
    pool: "threads",
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          exclude: ["src/**/*.component.test.{ts,tsx}", "src/**/*.integration.test.{ts,tsx}"],
          include: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/__test__/**/*.{test,spec}.{ts,tsx}"],
          name: "node",
        },
      },
      {
        extends: true,
        test: {
          environment: "node",
          hookTimeout: 20_000,
          include: ["src/**/*.integration.test.{ts,tsx}"],
          name: "integration",
          testTimeout: 20_000,
        },
      },
      {
        extends: true,
        test: {
          environment: "jsdom",
          include: ["src/**/*.component.test.{ts,tsx}"],
          name: "component",
        },
      },
    ],
    server: {
      deps: {
        inline: ["better-auth"],
      },
    },
    setupFiles: ["src/platform/testing/setup.ts"],
  },
}))
