import { ROUTES } from "~/src/routes"

export const ADMIN_NAVIGATION = [
  {
    items: [
      { titleKey: "dashboard", url: ROUTES.ADMIN },
      { titleKey: "analytics", url: ROUTES.ADMIN_ANALYTICS },
    ],
    titleKey: "overview",
  },
  {
    items: [
      { titleKey: "products", url: ROUTES.ADMIN_PRODUCTS },
      { titleKey: "pricingModels", url: ROUTES.ADMIN_PRICING },
    ],
    titleKey: "offerings",
  },
  {
    items: [
      { titleKey: "blog", url: ROUTES.ADMIN_BLOG },
      { titleKey: "courses", url: ROUTES.ADMIN_COURSES },
      { titleKey: "videos", url: ROUTES.ADMIN_VIDEOS },
      { titleKey: "landingPage", url: ROUTES.ADMIN_LANDING_PAGE },
    ],
    titleKey: "content",
  },
  {
    items: [
      { titleKey: "userManagement", url: ROUTES.ADMIN_USERS },
      { titleKey: "payments", url: ROUTES.ADMIN_PAYMENTS },
      { titleKey: "settings", url: ROUTES.ADMIN_SETTINGS },
    ],
    titleKey: "administration",
  },
] as const

export type AdminNavigationItem = (typeof ADMIN_NAVIGATION)[number]["items"][number]
