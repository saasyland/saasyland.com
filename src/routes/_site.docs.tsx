import { type JSX, useMemo } from "react"

import { DocsLayout } from "@fumadocs/base-ui/layouts/docs"
import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { Outlet, createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useFumadocsLoader } from "fumadocs-core/source/client"
import { useTranslations } from "use-intl/react"

import { ThemeProvider } from "~/src/providers/theme-provider"

import { source } from "~/src/integrations/fumadocs/fumadocs.source"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import { useFumadocsI18n } from "~/src/hooks/use-fumadocs-i18n"

import { layoutNamespaces } from "~/src/data/namespaces"

import { DocsPending } from "~/src/presentation/components/custom/docs-pending"
import { DocsToolbar } from "~/src/presentation/components/custom/docs-toolbar"
import { Footer } from "~/src/presentation/components/custom/footer"
import { Github } from "~/src/presentation/components/custom/icons"
import { LocaleSelect } from "~/src/presentation/components/custom/locale-switcher"
import { Navigation } from "~/src/presentation/components/custom/navigation"
import { ThemeSwitch } from "~/src/presentation/components/custom/theme-switch"

import docsCss from "~/src/presentation/styles/docs.css?url"

import { APP_GITHUB_OWNER, APP_GITHUB_REPO, APP_GITHUB_URL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

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

const DocsHeader = (): JSX.Element => (
  <>
    <Navigation />
    <DocsToolbar />
  </>
)

const CONTAINER = {
  className:
    "mx-auto w-full max-w-site pt-header [--fd-banner-height:var(--spacing-header)] max-md:[--fd-header-height:--spacing(12)] md:px-10",
} as const
const THEME = { enabled: false } as const
const THEME_SWITCH = { enabled: false } as const
const SLOTS = { header: DocsHeader, languageSelect: false } as const

const SIDEBAR = {
  className: "border-s",
  collapsible: false,
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
  const i18n = useFumadocsI18n()

  const t = useTranslations("navigation.content")
  const nav = useMemo(() => ({ title: t("header.docs"), url: ROUTES.DOCS }), [t])

  const { tree } = useFumadocsLoader(Route.useLoaderData())

  return (
    <>
      <RootProvider i18n={i18n} theme={THEME}>
        <DocsLayout
          containerProps={CONTAINER}
          links={LINKS}
          nav={nav}
          sidebar={SIDEBAR}
          slots={SLOTS}
          themeSwitch={THEME_SWITCH}
          tree={tree}
        >
          <Outlet />
        </DocsLayout>
      </RootProvider>
      <Footer />
    </>
  )
}

const NAMESPACES = ["fumadocs", ...layoutNamespaces("/_site/docs")] as const

export const Route = createFileRoute("/_site/docs")({
  component: DocumentationLayout,
  head: () => ({ links: [{ href: docsCss, rel: "stylesheet" }] }),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [pageTree] = await Promise.all([
      getPageTree({ data: locale }),
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
    ])
    return pageTree
  },
  pendingComponent: DocsPending,
  staticData: { namespaces: NAMESPACES },
})
