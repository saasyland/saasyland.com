import type { LayoutNamespaces } from "~/src/data/namespaces"

const NAMESPACES = ["auth.validations"] as const

export const NEWSLETTER_NAMESPACES = [
  { layout: "/_site/_marketing", namespaces: NAMESPACES },
  { layout: "/_site/docs", namespaces: NAMESPACES },
] as const satisfies readonly LayoutNamespaces[]
