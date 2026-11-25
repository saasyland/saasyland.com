import { type JSX, useMemo } from "react"

import { DocsLayout } from "@fumadocs/base-ui/layouts/docs"
import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useFumadocsLoader } from "fumadocs-core/source/client"
import { useTranslations } from "use-intl/react"
import { loadDocsIndex } from "virtual:content-indexes"

import { ThemeProvider } from "~/src/providers/theme-provider"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { useFumadocsI18n } from "~/src/hooks/use-fumadocs-i18n"

import { DOCS_CONTENT_ID } from "~/src/data/navigation.constants"

import { DocsPending } from "~/src/presentation/components/custom/docs-pending"
import { DocsSearchDialog } from "~/src/presentation/components/custom/docs-search-dialog"
import { DocsToolbar } from "~/src/presentation/components/custom/docs-toolbar"
import { Footer } from "~/src/presentation/components/custom/footer"
import { Github } from "~/src/presentation/components/custom/icons"
import { LocaleSelect } from "~/src/presentation/components/custom/locale-switcher"
import { ThemeSwitch } from "~/src/presentation/components/custom/theme-switch"

import docsCss from "~/src/presentation/styles/docs.css?url"

import { APP_GITHUB_OWNER, APP_GITHUB_REPO, APP_GITHUB_URL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

const LINKS = [
  {
    children: (
      <a
        className="flex flex-col gap-1.5 rounded-md p-2 text-sm text-fd-foreground/80 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
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

const CONTAINER = {
  className:
    "mx-auto w-full max-w-site pt-header [--fd-banner-height:var(--spacing-header)] max-md:[--fd-header-height:--spacing(12)] md:px-10",
} as const
const THEME = { enabled: false } as const
const SEARCH = { SearchDialog: DocsSearchDialog }
const THEME_SWITCH = { enabled: false } as const
const SLOTS = { header: DocsToolbar, languageSelect: false } as const

const SIDEBAR = {
  className: "border-s [&_.rounded-lg]:rounded-md [&_kbd]:rounded-sm",
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
      <RootProvider i18n={i18n} search={SEARCH} theme={THEME}>
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

const NAMESPACES = ["auth.validations", "flow-features", "fumadocs", "stack"] as const

export const Route = createFileRoute("/_site/docs")({
  component: DocumentationLayout,
  head: () => ({ links: [{ href: docsCss, rel: "stylesheet" }] }),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [{ tree }] = await Promise.all([
      loadDocsIndex(locale),
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
    ])
    return { tree }
  },
  pendingComponent: DocsPending,
  staticData: { contentId: DOCS_CONTENT_ID, namespaces: NAMESPACES },
})
