export const ACCEPT_INVITATION = "/auth/invite"
export const ADMIN = "/admin"
export const ADMIN_COURSES = "/admin/courses"
export const ADMIN_COURSES_CREATE = "/admin/courses/create"
export const ADMIN_ORDERS = "/admin/orders"
export const ADMIN_PRODUCTS = "/admin/products"
export const ADMIN_SETTINGS = "/admin/settings"
export const ADMIN_USERS = "/admin/users"
export const ADMIN_USERS_ALL = "/admin/users/all"
export const ADMIN_USERS_CUSTOMERS = "/admin/users/customers"
export const ADMIN_USERS_INVITATIONS = "/admin/users/invitations"
export const AFFILIATES = "/affiliates"
export const API = "/api"
export const API_AUTH = {
  ACCEPT_INVITATION: "/invitation/accept",
  ADMIN_CREATE_USER: "/admin/create-user",
  ADMIN_SET_USER_PASSWORD: "/admin/set-user-password",
  ADMIN_UPDATE_USER: "/admin/update-user",
  CALLBACK: "/callback",
  CHANGE_EMAIL: "/change-email",
  CHANGE_PASSWORD: "/change-password",
  GET_SESSION: "/get-session",
  REQUEST_PASSWORD_RESET: "/request-password-reset",
  RESET_PASSWORD: "/reset-password",
  SEND_VERIFICATION_EMAIL: "/send-verification-email",
  SET_PASSWORD: "/set-password",
  SIGN_IN_EMAIL: "/sign-in/email",
  SIGN_IN_SOCIAL: "/sign-in/social",
  SIGN_OUT: "/sign-out",
  SIGN_UP_EMAIL: "/sign-up/email",
  TWO_FACTOR: "/two-factor/*",
  UPDATE_USER: "/update-user",
} as const
export const API_AUTH_BASE = "/api/auth"
export const API_AUTH_POLAR = {
  CUSTOMER: "/customer/",
  CUSTOMER_PORTAL: "/customer/portal",
  WEBHOOKS: "/polar/webhooks",
} as const
export const API_AUTH_CUSTOMER_PORTAL = `${API_AUTH_BASE}${API_AUTH_POLAR.CUSTOMER_PORTAL}`
export const API_AUTH_VERIFY_EMAIL = `${API_AUTH_BASE}/verify-email`
export const APP = "/app"
export const APP_BILLING = "/app/billing"
export const APP_DELETE_ACCOUNT = "/app/settings/delete-account"
export const APP_LICENSE = "/app/license"
export const APP_SETTINGS = "/app/settings"
export const AUTH = "/auth"
export const AUTH_CALLBACK = "/auth/callback"
export const AUTHORS = "/authors"
export const BLOG = "/blog"
export const BLOG_FEED = `${BLOG}/rss.xml`
export const COURSES = "/courses"
export const COURSES_SITEMAP = "/sitemap-courses.xml"
export const DOCS = "/docs"
export const DOCS_CLI = `${DOCS}/cli`
export const DOCS_TEST_COVERAGE = `${DOCS}/tooling/test-coverage`
export const FORGOT_PASSWORD = "/auth/forgot-password"
export const HOME = "/"
export const LICENCE = "/licence"
export const NEWSLETTER = "/newsletter"
export const NEWSLETTER_CONFIRM = "/newsletter/confirm"
export const NEWSLETTER_UNSUBSCRIBE = "/newsletter/unsubscribe"
export const PRIVACY = "/privacy"
export const REFUNDS = "/refunds"
export const RESET_PASSWORD = "/auth/reset-password"
export const SIGN_IN = "/auth/sign-in"
export const SIGN_UP = "/auth/sign-up"
export const TERMS = "/terms"
export const TWO_FACTOR = "/auth/two-factor"
export const VERIFY_EMAIL = "/auth/verify-email"
export const WITHDRAWAL = "/withdrawal"

export const REQUEST_RENDERED_ROUTES: readonly string[] = [ADMIN, API, APP, AUTH, COURSES, NEWSLETTER]

export const isRequestRenderedRoute = (pathname: string): boolean =>
  REQUEST_RENDERED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
