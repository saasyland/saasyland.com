import type { JSX } from "react"

import { Link, Outlet, createFileRoute, useMatch } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AUTH_ASSURANCES } from "~/src/data/auth"

import { AuthPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

const AuthLayout = (): JSX.Element => {
  const t = useTranslations("auth")
  const isSignUp = useMatch({ from: ROUTES.SIGN_UP, shouldThrow: false }) !== undefined

  return (
    <div className="dark relative grid min-h-svh grid-cols-1 bg-background text-foreground antialiased lg:grid-cols-2">
      <header className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between gap-6 px-6 md:px-10">
        <Link
          className="flex h-11 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to={ROUTES.HOME}
        >
          <Wordmark />
        </Link>

        <Link
          className="group inline-flex h-11 items-center gap-2 text-body-sm font-medium text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground"
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

      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-background p-12 lg:flex xl:p-16">
        <div aria-hidden className="field-grid pointer-events-none absolute inset-0" />

        <p className="relative max-w-md text-display-gate text-balance text-foreground">
          {t(isSignUp ? "gate.signUpHeadline" : "gate.headline")}
        </p>

        <ul className="relative flex flex-col gap-5">
          {AUTH_ASSURANCES.map((id) => (
            <li className="flex items-start gap-3" key={id}>
              <span aria-hidden className="mt-2 size-1.25 shrink-0 rounded-xs bg-ring" />
              <span className="font-mono text-spec text-muted-foreground">{t(`gate.assurances.${id}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <main className="relative flex flex-col items-center justify-center px-6 py-28 md:px-10 lg:py-32">
        <div className="flex w-full max-w-105 flex-col">
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
