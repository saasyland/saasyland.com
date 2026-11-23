import type { ReactElement } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterContextProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { AbstractIntlMessages } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import type { Account } from "~/src/modules/account/account.types"
import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"

import * as ROUTES from "~/src/routes"

type SettingsSession = ReturnType<typeof createAuthSessionFixture>

interface SettingsRenderOptions {
  readonly accounts?: readonly Account["linked"][]
  readonly locale?: string
  readonly messages?: AbstractIntlMessages
  readonly path?: string
  readonly seed?: (queryClient: QueryClient) => void
  readonly session?: SettingsSession | null
}

export const SETTINGS_DATE = new Date("2026-09-20T12:00:00Z")

const settingsMessages = getTestMessages("en-US")

const linkedAccount = (providerId: string): Account["linked"] => ({
  createdAt: SETTINGS_DATE,
  id: `${providerId}-account`,
  providerId,
})

export const CREDENTIAL_ACCOUNT = linkedAccount(AUTH_PROVIDER.CREDENTIAL)
export const GITHUB_ACCOUNT = linkedAccount(AUTH_PROVIDER.GITHUB)
export const GOOGLE_ACCOUNT = linkedAccount(AUTH_PROVIDER.GOOGLE)

export const settingsSession = ({ emailVerified = true, twoFactorEnabled = false } = {}): SettingsSession => {
  const session = createAuthSessionFixture()

  return { ...session, user: { ...session.user, emailVerified, twoFactorEnabled } }
}

const settingsRouter = (path: string) => {
  const rootRoute = createRootRoute()
  const pages = [ROUTES.ADMIN_SETTINGS, ROUTES.APP_SETTINGS].map((page) => createRoute({ getParentRoute: () => rootRoute, path: page }))

  return createRouter({
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: LOCALE_REWRITE,
    routeTree: rootRoute.addChildren(pages),
  })
}

const settingsQueryClient = ({
  accounts = [CREDENTIAL_ACCOUNT],
  seed,
  session = settingsSession(),
}: SettingsRenderOptions): QueryClient => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  queryClient.setQueryData(listAccountsQuery.queryKey, [...accounts])
  seed?.(queryClient)
  return queryClient
}

export const renderSettings = (ui: ReactElement, options: SettingsRenderOptions = {}) => {
  const { locale = "en-US", messages = settingsMessages, path = ROUTES.APP_SETTINGS } = options
  const queryClient = settingsQueryClient(options)
  const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={settingsRouter(path)}>
        <IntlProvider formats={I18N.FORMATS} locale={locale} messages={messages} timeZone={I18N.DEFAULT_TIMEZONE}>
          {ui}
        </IntlProvider>
      </RouterContextProvider>
    </QueryClientProvider>,
  )

  return { ...result, invalidate, queryClient, user: userEvent.setup({ delay: null }) }
}
