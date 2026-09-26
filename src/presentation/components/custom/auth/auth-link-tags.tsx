import type { ReactNode } from "react"

import { Link } from "@tanstack/react-router"

import { ROUTES } from "~/src/routes"

const AUTH_LINK_CLASS = "font-medium text-foreground underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"

export const AUTH_LINK_TAGS = {
  signin: (chunks: ReactNode) => (
    <Link className={AUTH_LINK_CLASS} to={ROUTES.SIGN_IN}>
      {chunks}
    </Link>
  ),
  signup: (chunks: ReactNode) => (
    <Link className={AUTH_LINK_CLASS} to={ROUTES.SIGN_UP}>
      {chunks}
    </Link>
  ),
}
