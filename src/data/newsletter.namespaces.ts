import type { LayoutNamespaces } from "~/src/data/namespaces"

const NAMESPACES = ["auth.validations"] as const

export const NEWSLETTER_NAMESPACES = [
  { layout: "/_landing", namespaces: NAMESPACES },
  { layout: "/blog", namespaces: NAMESPACES },
] as const satisfies readonly LayoutNamespaces[]
