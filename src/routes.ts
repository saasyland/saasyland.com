const ADMIN = "/admin"
const ADMIN_COURSES = `${ADMIN}/courses` as const
const ADMIN_NEWSLETTER = `${ADMIN}/newsletter` as const
const ADMIN_USERS = `${ADMIN}/users` as const
const API = "/api"
const API_AUTH = `${API}/auth` as const
const APP = "/app"
const APP_SETTINGS = `${APP}/settings` as const
const AUTH = "/auth"
const BLOG = "/blog"
const COURSES = "/courses"
const DOCS = "/docs"
const NEWSLETTER = "/newsletter"
const POLAR_CUSTOMER = "/customer/"
const POLAR_CUSTOMER_PORTAL = `${POLAR_CUSTOMER}portal` as const

export const ROUTES = {
  ADMIN: {
    COURSES: {
      CREATE: `${ADMIN_COURSES}/create`,
      INDEX: ADMIN_COURSES,
    },
    INDEX: ADMIN,
    NEWSLETTER: {
      COMPOSE: `${ADMIN_NEWSLETTER}/compose`,
      INDEX: ADMIN_NEWSLETTER,
      ISSUES: `${ADMIN_NEWSLETTER}/issues`,
    },
    ORDERS: `${ADMIN}/orders`,
    PRODUCTS: `${ADMIN}/products`,
    SETTINGS: `${ADMIN}/settings`,
    USERS: {
      ALL: `${ADMIN_USERS}/all`,
      CUSTOMERS: `${ADMIN_USERS}/customers`,
      INDEX: ADMIN_USERS,
      INVITATIONS: `${ADMIN_USERS}/invitations`,
    },
  },
  AFFILIATES: "/affiliates",
  API: {
    AUTH: {
      ACCEPT_INVITATION: "/invitation/accept",
      ADMIN_CREATE_USER: "/admin/create-user",
      ADMIN_SET_USER_PASSWORD: "/admin/set-user-password",
      ADMIN_UPDATE_USER: "/admin/update-user",
      BASE: API_AUTH,
      CALLBACK: "/callback",
      CHANGE_EMAIL: "/change-email",
      CHANGE_PASSWORD: "/change-password",
      CUSTOMER_PORTAL: `${API_AUTH}${POLAR_CUSTOMER_PORTAL}`,
      GET_SESSION: "/get-session",
      POLAR: {
        CUSTOMER: POLAR_CUSTOMER,
        CUSTOMER_PORTAL: POLAR_CUSTOMER_PORTAL,
        WEBHOOKS: "/polar/webhooks",
      },
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
      VERIFY_EMAIL: `${API_AUTH}/verify-email`,
    },
    INDEX: API,
  },
  APP: {
    BILLING: `${APP}/billing`,
    INDEX: APP,
    LICENSE: `${APP}/license`,
    SETTINGS: {
      DELETE_ACCOUNT: `${APP_SETTINGS}/delete-account`,
      INDEX: APP_SETTINGS,
    },
  },
  AUTH: {
    BASE: AUTH,
    CALLBACK: `${AUTH}/callback`,
    FORGOT_PASSWORD: `${AUTH}/forgot-password`,
    INVITE: `${AUTH}/invite`,
    RESET_PASSWORD: `${AUTH}/reset-password`,
    SIGN_IN: `${AUTH}/sign-in`,
    SIGN_UP: `${AUTH}/sign-up`,
    TWO_FACTOR: `${AUTH}/two-factor`,
    VERIFY_EMAIL: `${AUTH}/verify-email`,
  },
  AUTHORS: "/authors",
  BLOG: {
    FEED: `${BLOG}/rss.xml`,
    INDEX: BLOG,
  },
  COURSES,
  DOCS: {
    CLI: `${DOCS}/cli`,
    INDEX: DOCS,
    PROJECT: {
      ROADMAP: `${DOCS}/project/roadmap`,
    },
    TOOLING: {
      TEST_COVERAGE: `${DOCS}/tooling/test-coverage`,
    },
  },
  HOME: "/",
  LICENCE: "/licence",
  NEWSLETTER: {
    BASE: NEWSLETTER,
    CONFIRM: `${NEWSLETTER}/confirm`,
    UNSUBSCRIBE: `${NEWSLETTER}/unsubscribe`,
  },
  PRIVACY: "/privacy",
  REFUNDS: "/refunds",
  SITEMAPS: {
    COURSES: "/sitemap-courses.xml",
  },
  TERMS: "/terms",
  WITHDRAWAL: "/withdrawal",
} as const

export const REQUEST_RENDERED_ROUTES: readonly string[] = [
  ROUTES.ADMIN.INDEX,
  ROUTES.API.INDEX,
  ROUTES.APP.INDEX,
  ROUTES.AUTH.BASE,
  ROUTES.COURSES,
  ROUTES.NEWSLETTER.BASE,
]

export const isRequestRenderedRoute = (pathname: string): boolean =>
  REQUEST_RENDERED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
