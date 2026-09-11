import type { ReactElement } from "react"

import { QueryClient } from "@tanstack/react-query"
import { IntlProvider } from "use-intl/react"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import type { Category } from "~/src/modules/category/category.types"
import { getCategoriesQuery } from "~/src/modules/category/use-cases/get-categories"
import type { Product } from "~/src/modules/product/product.types"
import { getProductsQuery } from "~/src/modules/product/use-cases/get-products"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import type { User } from "~/src/modules/user/user.types"

export const adminMessages = getTestMessages("en-US")
export const fixtureDate = new Date("2025-01-01T12:00:00Z")

export const adminUser = (overrides: Partial<User["select"]> = {}): User["select"] => ({
  banExpires: null,
  banReason: null,
  banned: false,
  createdAt: fixtureDate,
  email: "ada@example.com",
  emailVerified: true,
  id: "ada",
  image: null,
  name: "Ada Lovelace",
  role: "customer",
  timezone: "Europe/Warsaw",
  twoFactorEnabled: false,
  updatedAt: fixtureDate,
  ...overrides,
})

export const adminProduct = (overrides: Partial<Product["select"]> = {}): Product["select"] => ({
  billingCycle: null,
  createdAt: fixtureDate,
  currency: "USD",
  description: "A professional starter",
  id: "starter",
  name: "Starter Kit",
  priceCents: 4900,
  status: "published",
  type: "one_time",
  updatedAt: fixtureDate,
  ...overrides,
})

export const adminCategory = (overrides: Partial<Category["select"]> = {}): Category["select"] => ({
  createdAt: fixtureDate,
  description: "Starter projects",
  icon: "FolderOpen",
  id: "starters",
  kind: "category",
  name: "Starters",
  updatedAt: fixtureDate,
  visibility: "public",
  ...overrides,
})

export const adminQueryClient = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, createAuthSessionFixture({ role: "admin" }))
  queryClient.setQueryData(getProductsQuery.queryKey, [adminProduct()])
  queryClient.setQueryData(getUsersQuery.queryKey, [adminUser()])
  queryClient.setQueryData(getCategoriesQuery.queryKey, [adminCategory()])
  queryClient.setQueryData(getActiveSessionsQuery.queryKey, [])
  return queryClient
}

export const renderAdmin = (ui: ReactElement, { path = "/admin", queryClient = adminQueryClient() } = {}) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={adminMessages} timeZone="UTC">
      {ui}
    </IntlProvider>,
    { queryClient, router: createTestRouter(path) },
  )
