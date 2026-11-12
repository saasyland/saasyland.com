import type { JSX, ReactNode } from "react"

import { Link } from "@tanstack/react-router"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"

import { ROUTES } from "~/src/routes"

const AUTH_LINK_CLASS = "font-medium text-foreground underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"

const AuthLink = ({
  children,
  to,
}: {
  readonly children: ReactNode
  readonly to: typeof ROUTES.SIGN_IN | typeof ROUTES.SIGN_UP
}): JSX.Element => {
  const { redirect } = useAuthRedirect()

  return (
    <Link className={AUTH_LINK_CLASS} search={{ redirect }} to={to}>
      {children}
    </Link>
  )
}

export const AUTH_LINK_TAGS = {
  signin: (chunks: ReactNode) => <AuthLink to={ROUTES.SIGN_IN}>{chunks}</AuthLink>,
  signup: (chunks: ReactNode) => <AuthLink to={ROUTES.SIGN_UP}>{chunks}</AuthLink>,
}
