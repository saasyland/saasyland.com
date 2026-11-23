import type { JSX } from "react"

import { createFileRoute, redirect } from "@tanstack/react-router"
import * as zod from "zod"

import { redirectIfVerified } from "~/src/integrations/better-auth/auth.routes"
import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { readUnverifiedJwtPayload } from "~/src/lib/jwt"
import { searchFlag, searchText } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { VerifyEmailPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { VerifyEmailForm, VerifyEmailHeading } from "~/src/presentation/components/custom/auth/verify-email-form"

import * as ROUTES from "~/src/routes"

const VerifyEmailPage = (): JSX.Element => (
  <>
    <VerifyEmailHeading />
    <VerifyEmailForm />
  </>
)

const NAMESPACE = "pages.auth.verify-email"

const tokenPayloadSchema = zod.object({ email: zod.email() })

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: authSearchSchema.extend({
    email: searchText(),
    error: searchText(),
    token: searchText(),
    unverified: searchFlag(),
    verified: searchFlag(),
  }),
  beforeLoad: async (context) => {
    const { buildLocation, preload, search } = context
    if (preload) {
      return
    }
    if (search.token !== undefined) {
      const email = readUnverifiedJwtPayload(search.token, tokenPayloadSchema)?.email
      const { publicHref: callbackURL } = buildLocation({
        search: { email, redirect: search.redirect, verified: true },
        to: ROUTES.VERIFY_EMAIL,
      })
      const query = new URLSearchParams({ callbackURL, token: search.token })
      throw redirect({ href: `${ROUTES.API_AUTH_VERIFY_EMAIL}?${query}`, reloadDocument: true, replace: true })
    }
    await redirectIfVerified(context)
  },
  component: VerifyEmailPage,
  head: pageHead(ROUTES.VERIFY_EMAIL),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: VerifyEmailPending,
  staticData: { namespaces: [NAMESPACE] },
})
