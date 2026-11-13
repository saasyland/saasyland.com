import type { JSX, MouseEvent } from "react"

import { Link, useLocation, useNavigate } from "@tanstack/react-router"

import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

export const HomeLink = (): JSX.Element => {
  const navigate = useNavigate()

  const { hash, pathname } = useLocation()

  const returnToTop = (event: MouseEvent<HTMLAnchorElement>): void => {
    const opensElsewhere = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
    if (pathname !== ROUTES.HOME || opensElsewhere) {
      return
    }

    event.preventDefault()
    globalThis.scrollTo({ top: 0 })

    if (hash.length > 0) {
      void navigate({ replace: true, resetScroll: false, to: ROUTES.HOME })
    }
  }

  return (
    <Link
      className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      onClick={returnToTop}
      to={ROUTES.HOME}
    >
      <Wordmark />
    </Link>
  )
}
