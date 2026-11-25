import type { ComponentType, ReactElement } from "react"

import { QueryClient } from "@tanstack/react-query"
import { IntlProvider } from "use-intl/react"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { seedAuthQueries } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { seedCoursesQueries } from "~/src/presentation/components/custom/admin/__test__/courses.fixtures"
import { seedLicenseQueries } from "~/src/presentation/components/custom/admin/__test__/license.fixtures"
import { seedNewsletterQueries } from "~/src/presentation/components/custom/admin/__test__/newsletter.fixtures"
import { seedPaymentsQueries } from "~/src/presentation/components/custom/admin/__test__/payments.fixtures"
import { seedProductsQueries } from "~/src/presentation/components/custom/admin/__test__/products.fixtures"
import { seedTeamQueries } from "~/src/presentation/components/custom/admin/__test__/team.fixtures"

interface AdminRenderOptions {
  readonly path?: string
  readonly queryClient?: QueryClient
}

export const adminMessages = getTestMessages("en-US")

export const adminQueryClient = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
  for (const seed of [
    seedAuthQueries,
    seedCoursesQueries,
    seedLicenseQueries,
    seedNewsletterQueries,
    seedPaymentsQueries,
    seedProductsQueries,
    seedTeamQueries,
  ]) {
    seed(queryClient)
  }
  return queryClient
}

export const renderAdmin = (ui: ReactElement, { path = "/admin", queryClient = adminQueryClient() }: AdminRenderOptions = {}) =>
  renderWithRouter(
    <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={adminMessages} timeZone={I18N.DEFAULT_TIMEZONE}>
      {ui}
    </IntlProvider>,
    { queryClient, router: createTestRouter(path) },
  )

export const renderAdminPage = (Page: ComponentType | undefined, options: AdminRenderOptions = {}) => {
  if (!Page) {
    throw new Error("The route must provide a page")
  }
  return renderAdmin(<Page />, options)
}

export const breadcrumbDividers = (container: HTMLElement) =>
  [...container.querySelectorAll("span[aria-hidden]")].filter((span) => span.textContent === "/")
