import type { JSX } from "react"

import { Link, Outlet, createFileRoute, useMatch } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AUTH_ASSURANCES } from "~/src/data/auth"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { AuthPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import * as ROUTES from "~/src/routes"

const AuthLayout = (): JSX.Element => {
  const t = useTranslations("auth")
  const isSignUp = useMatch({ from: ROUTES.SIGN_UP, shouldThrow: false }) !== undefined
  const isVerifyEmail = useMatch({ from: ROUTES.VERIFY_EMAIL, shouldThrow: false }) !== undefined

  return (
    <div className="dark grid min-h-svh grid-cols-[minmax(0,var(--form-width))] grid-rows-[auto_1fr] justify-center bg-background px-(--gutter) text-foreground [--form-width:--spacing(105)] [--gutter:--spacing(6)] md:[--gutter:--spacing(10)] lg:grid-cols-2 lg:px-0">
      <header className="relative z-10 col-span-full row-start-1 flex h-header items-center justify-between gap-6 lg:grid lg:grid-cols-subgrid lg:px-(--gutter)">
        <Link
          className="flex h-11 items-center justify-self-start rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to={ROUTES.HOME}
        >
          <Wordmark />
        </Link>

        <Link
          className="group inline-flex h-11 items-center gap-2 justify-self-end text-body-sm font-medium text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground"
          to={ROUTES.HOME}
        >
          <ArrowLeft
            aria-hidden
            className="size-4 transition-transform duration-200 ease-exp group-hover:-translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            strokeWidth={1.5}
          />
          {t("layout.backToHome")}
        </Link>
      </header>

      <aside className="relative hidden overflow-hidden border-r border-border px-(--gutter) lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:grid lg:grid-rows-subgrid">
        <div aria-hidden className="field-grid pointer-events-none absolute inset-0" />

        <div className="relative row-start-2 flex flex-col justify-between gap-12 py-12">
          <p className="max-w-md text-display-gate text-balance text-foreground">
            {t(isSignUp || isVerifyEmail ? "gate.signUpHeadline" : "gate.headline")}
          </p>

          <ul className="flex flex-col gap-5">
            {AUTH_ASSURANCES.map((id) => (
              <li className="flex items-start gap-3" key={id}>
                <span aria-hidden className="mt-2 size-1.25 shrink-0 rounded-full bg-ring" />
                <span className="text-spec text-muted-foreground">
                  {t(`gate.assurances.${id}`, { coverageThreshold: REPOSITORY_FACTS.coverageThreshold })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="row-start-2 flex flex-col items-center py-12 lg:col-start-2 lg:px-(--gutter)">
        <div className="flex w-full max-w-(--form-width) flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const NAMESPACES = ["auth.errors", "auth.form", "auth.gate", "auth.layout", "auth.oauth", "auth.validations"] as const

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
  loader: ({ context }) => preloadNamespaces({ locale: getCurrentLocale(), namespaces: NAMESPACES, queryClient: context.queryClient }),
  pendingComponent: AuthPending,
  staticData: { namespaces: NAMESPACES },
})
