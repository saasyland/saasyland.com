import { createFileRoute, notFound } from "@tanstack/react-router"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { notFoundHead } from "~/src/lib/not-found"

export const Route = createFileRoute("/_site/_marketing/$")({
  head: () => notFoundHead(getCurrentLocale()),
  loader: () => {
    throw notFound()
  },
})
