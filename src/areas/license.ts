import type { BrowserArea } from "~/src/areas/browser"

export const LICENSE_BROWSER = {
  layoutNamespaces: [
    { layout: "/app", namespaces: ["pages.license", "pages.withdrawal", "withdrawal.validations"] },
    { layout: "/_site/_marketing", namespaces: ["withdrawal.validations"] },
    { layout: "/admin/users", namespaces: ["pages.admin.users.license"] },
  ],
  name: "license",
} as const satisfies BrowserArea
