export const ROUTES = {
  ADMIN: {
    COURSES: {
      CREATE: "/admin/courses/create",
      INDEX: "/admin/courses",
    },
    INDEX: "/admin",
    NEWSLETTER: {
      COMPOSE: "/admin/newsletter/compose",
      INDEX: "/admin/newsletter",
      ISSUES: "/admin/newsletter/issues",
    },
    ORDERS: "/admin/orders",
    PRODUCTS: "/admin/products",
    SETTINGS: "/admin/settings",
    USERS: {
      ALL: "/admin/users/all",
      CUSTOMERS: "/admin/users/customers",
      INDEX: "/admin/users",
      INVITATIONS: "/admin/users/invitations",
    },
  },
  AFFILIATES: "/affiliates",
  API: {
    AUTH: {
      ACCEPT_INVITATION: "/invitation/accept",
      ADMIN_CREATE_USER: "/admin/create-user",
      ADMIN_SET_USER_PASSWORD: "/admin/set-user-password",
      ADMIN_UPDATE_USER: "/admin/update-user",
      BASE: "/api/auth",
      CALLBACK: "/callback",
      CHANGE_EMAIL: "/change-email",
      CHANGE_PASSWORD: "/change-password",
      CUSTOMER_PORTAL: "/api/auth/customer/portal",
      GET_SESSION: "/get-session",
      POLAR: {
        CUSTOMER: "/customer/",
        CUSTOMER_PORTAL: "/customer/portal",
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
      VERIFY_EMAIL: "/api/auth/verify-email",
    },
    INDEX: "/api",
  },
  APP: {
    BILLING: "/app/billing",
    INDEX: "/app",
    LICENSE: "/app/license",
    SETTINGS: {
      DELETE_ACCOUNT: "/app/settings/delete-account",
      INDEX: "/app/settings",
    },
  },
  AUTH: {
    BASE: "/auth",
    CALLBACK: "/auth/callback",
    FORGOT_PASSWORD: "/auth/forgot-password",
    INVITE: "/auth/invite",
    RESET_PASSWORD: "/auth/reset-password",
    SIGN_IN: "/auth/sign-in",
    SIGN_UP: "/auth/sign-up",
    TWO_FACTOR: "/auth/two-factor",
    VERIFY_EMAIL: "/auth/verify-email",
  },
  AUTHORS: "/authors",
  BLOG: {
    FEED: "/blog/rss.xml",
    INDEX: "/blog",
  },
  COURSES: "/courses",
  DOCS: {
    CLI: "/docs/cli",
    INDEX: "/docs",
    PROJECT: {
      ROADMAP: "/docs/project/roadmap",
      SECURITY_POLICY: "/docs/project/security-policy",
    },
    TOOLING: {
      TEST_COVERAGE: "/docs/tooling/test-coverage",
    },
  },
  HOME: "/",
  LICENCE: "/licence",
  NEWSLETTER: {
    BASE: "/newsletter",
    CONFIRM: "/newsletter/confirm",
    UNSUBSCRIBE: "/newsletter/unsubscribe",
  },
  PRIVACY: "/privacy",
  REFUNDS: "/refunds",
  SITEMAPS: {
    COURSES: "/sitemap-courses.xml",
  },
  TERMS: "/terms",
  WELL_KNOWN: {
    SECURITY_TXT: "/.well-known/security.txt",
  },
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
