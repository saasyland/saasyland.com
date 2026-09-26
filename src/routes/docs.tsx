import { type JSX, useMemo } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useFumadocsLoader } from "fumadocs-core/source/client"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/tanstack"

import { ThemeProvider } from "~/src/providers/theme-provider"

import { source } from "~/src/integrations/fumadocs/fumadocs.source"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import { DocsPending } from "~/src/presentation/components/custom/docs-pending"
import { Github } from "~/src/presentation/components/custom/icons"
import { LocaleSelect } from "~/src/presentation/components/custom/locale-switcher"
import { ThemeSwitch } from "~/src/presentation/components/custom/theme-switch"

import docsCss from "~/src/presentation/styles/docs.css?url"

import { APP_GITHUB_OWNER, APP_GITHUB_REPO, APP_GITHUB_URL, APP_NAME } from "~/src/presentation/branding"

const getPageTree = createServerFn({ method: "GET" })
  .validator(localeField)
  .handler(async ({ data: locale }) => ({ tree: await source.serializePageTree(source.getPageTree(locale)) }))

const LINKS = [
  {
    children: (
      <a
        className="flex flex-col gap-1.5 rounded-lg p-2 text-sm text-fd-foreground/80 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
        href={APP_GITHUB_URL}
        rel="noreferrer noopener"
        target="_blank"
      >
        <p className="flex items-center gap-2 truncate">
          <Github className="size-3.5" />
          {APP_GITHUB_OWNER}/{APP_GITHUB_REPO}
        </p>
      </a>
    ),
    type: "custom" as const,
  },
]

const NAV = { title: APP_NAME } as const
const THEME = { enabled: false } as const
const THEME_SWITCH = { enabled: false } as const
const SLOTS = { languageSelect: false } as const

const SIDEBAR = {
  footer: (
    <div className="flex flex-col gap-2">
      <LocaleSelect />
      <ThemeProvider>
        <ThemeSwitch />
      </ThemeProvider>
    </div>
  ),
}

const DocumentationLayout = (): JSX.Element => {
  const locale = getCurrentLocale()
  const i18n = useMemo(() => ({ locale }), [locale])

  const { tree } = useFumadocsLoader(Route.useLoaderData())

  return (
    <RootProvider i18n={i18n} theme={THEME}>
      <DocsLayout links={LINKS} nav={NAV} sidebar={SIDEBAR} slots={SLOTS} themeSwitch={THEME_SWITCH} tree={tree}>
        <Outlet />
      </DocsLayout>
    </RootProvider>
  )
}

export const Route = createFileRoute("/docs")({
  component: DocumentationLayout,
  head: () => ({ links: [{ href: docsCss, rel: "stylesheet" }] }),
  loader: () => getPageTree({ data: getCurrentLocale() }),
  pendingComponent: DocsPending,
})
