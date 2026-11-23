import type { BrowserArea } from "~/src/areas/browser"

const NAMESPACES = ["auth.validations"] as const

export const NEWSLETTER_BROWSER = {
  layoutNamespaces: [
    { layout: "/_site/_marketing", namespaces: NAMESPACES },
    { layout: "/_site/docs", namespaces: NAMESPACES },
  ],
  name: "newsletter",
} as const satisfies BrowserArea
