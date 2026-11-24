import { BookOpen, Globe, GraduationCap, Home, KeyRound, Package, ReceiptText, Settings, SquarePen, Users, UsersRound } from "lucide-react"

import {
  ADMIN_NAVIGATION_GROUP,
  type AdminNavigationGroup,
  FOOTER_COLUMN,
  type FooterNavigationColumn,
  type IconEntry,
  MARKETING_SECTION_IDS,
  type SiteEntry,
} from "~/src/data/navigation.constants"

import * as ROUTES from "~/src/routes"

export const ADMIN_NAVIGATION: readonly AdminNavigationGroup[] = [
  {
    items: [{ icon: Home, label: "navigation.auth.admin.dashboard", to: ROUTES.ADMIN }],
    key: ADMIN_NAVIGATION_GROUP.OVERVIEW,
  },
  {
    items: [{ icon: Package, label: "navigation.products.admin.products", to: ROUTES.ADMIN_PRODUCTS }],
    key: ADMIN_NAVIGATION_GROUP.OFFERINGS,
  },
  {
    items: [{ icon: ReceiptText, label: "navigation.payments.admin.orders", to: ROUTES.ADMIN_ORDERS }],
    key: ADMIN_NAVIGATION_GROUP.SALES,
  },
  {
    items: [
      {
        breadcrumbs: { create: "navigation.courses.breadcrumbs.create" },
        icon: GraduationCap,
        label: "navigation.courses.admin.courses",
        to: ROUTES.ADMIN_COURSES,
      },
    ],
    key: ADMIN_NAVIGATION_GROUP.CONTENT,
  },
  {
    items: [
      { icon: Users, label: "navigation.auth.admin.userManagement", to: ROUTES.ADMIN_USERS },
      { icon: Settings, label: "navigation.auth.admin.settings", to: ROUTES.ADMIN_SETTINGS },
    ],
    key: ADMIN_NAVIGATION_GROUP.ADMINISTRATION,
  },
]

export const ADMIN_COMMAND_ACTIONS: readonly IconEntry[] = [
  { icon: SquarePen, label: "navigation.courses.command.newCourse", to: ROUTES.ADMIN_COURSES_CREATE },
  { icon: Globe, label: "navigation.auth.command.viewSite", to: ROUTES.HOME },
]

export const ADMIN_DASHBOARD_ACTIONS: readonly IconEntry[] = [
  { icon: ReceiptText, label: "navigation.payments.dashboard.orders", to: ROUTES.ADMIN_ORDERS },
  { icon: UsersRound, label: "navigation.payments.dashboard.customers", to: ROUTES.ADMIN_USERS_CUSTOMERS },
]

export const APP_NAVIGATION: readonly IconEntry[] = [
  { icon: Home, label: "navigation.auth.app.overview", to: ROUTES.APP },
  { icon: KeyRound, label: "navigation.license.app.license", to: ROUTES.APP_LICENSE },
  { icon: GraduationCap, label: "navigation.courses.app.courses", to: ROUTES.COURSES },
  { icon: Settings, label: "navigation.auth.app.settings", to: ROUTES.APP_SETTINGS },
]

export const APP_RESOURCE_NAVIGATION: readonly IconEntry[] = [
  { icon: BookOpen, label: "navigation.content.appResources.docs", to: ROUTES.DOCS },
]

export const HEADER_NAVIGATION: readonly SiteEntry[] = [
  { hash: MARKETING_SECTION_IDS.PRICING, label: "navigation.core.header.pricing", to: ROUTES.HOME },
  { label: "navigation.courses.header.courses", to: ROUTES.COURSES },
  { label: "navigation.content.header.blog", to: ROUTES.BLOG },
  { label: "navigation.content.header.docs", to: ROUTES.DOCS },
  { label: "navigation.auth.header.signIn", signedIn: { label: "navigation.auth.header.account" }, to: ROUTES.SIGN_IN },
]

export const FOOTER_NAVIGATION: readonly FooterNavigationColumn[] = [
  {
    key: FOOTER_COLUMN.PRODUCT,
    links: [
      { label: "navigation.content.footer.docs", to: ROUTES.DOCS },
      { label: "navigation.content.footer.blog", to: ROUTES.BLOG },
      { label: "navigation.affiliates.footer.affiliates", to: ROUTES.AFFILIATES },
      { label: "navigation.auth.footer.signIn", signedIn: { label: "navigation.auth.footer.account" }, to: ROUTES.SIGN_IN },
    ],
  },
  {
    key: FOOTER_COLUMN.LEGAL,
    links: [
      { label: "navigation.legal.footer.privacy", to: ROUTES.PRIVACY },
      { label: "navigation.legal.footer.terms", to: ROUTES.TERMS },
      { label: "navigation.legal.footer.refunds", to: ROUTES.REFUNDS },
      { label: "navigation.license.footer.withdrawal", to: ROUTES.WITHDRAWAL },
      { label: "navigation.legal.footer.licence", to: ROUTES.LICENCE },
    ],
  },
]
