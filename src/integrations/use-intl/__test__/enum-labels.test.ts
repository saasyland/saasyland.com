import { expect, it } from "vite-plus/test"

import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.access"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import { COURSE_KIND, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { LICENSE_STATUS, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"
import { USER_STATUS } from "~/src/modules/user/user.constants"

import { ADMIN_BLOG_POST_STATUS } from "~/src/data/admin-blog"
import { ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { FOOTER_SECTIONS, NAVIGATION_SECTIONS } from "~/src/data/marketing"
import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, NAVIGATION_PAGES } from "~/src/data/navigation"

const TIER_LABELS = ["cta", "name", "period", "tagline", "whoFor"] as const

const ENUM_LABELS = [
  { keys: Object.values(AUTH_ERRORS), labels: "auth.errors" },
  { keys: FOOTER_NAVIGATION.map(({ key }) => key), labels: "components.custom.footer.columns" },
  {
    keys: [...FOOTER_SECTIONS, ...FOOTER_NAVIGATION.flatMap(({ links }) => links.map(({ key }) => key))],
    labels: "components.custom.footer.links",
  },
  { keys: [...NAVIGATION_SECTIONS, ...NAVIGATION_PAGES.map(({ key }) => key)], labels: "components.custom.navigation.items" },
  { keys: LICENSE_TIERS.flatMap((tier) => TIER_LABELS.map((label) => `${tier}.${label}`)), labels: "components.custom.pricing.tiers" },
  { keys: Object.values(ERROR_CODES), labels: "errors.codes" },
  { keys: Object.values(ADMIN_BLOG_POST_STATUS), labels: "pages.admin.blog.badges" },
  { keys: Object.values(COURSE_KIND), labels: "pages.admin.courses.form.kinds" },
  { keys: Object.values(COURSE_STATUS), labels: "pages.admin.courses.form.statuses" },
  { keys: Object.values(LESSON_ACCESS), labels: "pages.admin.courses.lesson.accessLevels" },
  { keys: Object.values(LESSON_STATUS), labels: "pages.admin.courses.lesson.statuses" },
  { keys: ADMIN_DASHBOARD_ACTIONS.map(({ key }) => key), labels: "pages.admin.dashboard.actions" },
  { keys: ADMIN_DASHBOARD_STATS.map(({ key }) => `${key}.title`), labels: "pages.admin.dashboard.stats" },
  { keys: Object.values(USER_STATUS), labels: "pages.admin.dashboard.users.table.status" },
  { keys: Object.values(PRODUCT_STATUS), labels: "pages.admin.products.table.statusLabels" },
  { keys: Object.values(PRODUCT_TYPE), labels: "pages.admin.products.table.typeLabels" },
  { keys: Object.values(CATEGORY_VISIBILITY), labels: "pages.admin.products.table.visibilityLabels" },
  { keys: ADMIN_NAVIGATION.map(({ key }) => key), labels: "pages.admin.sidebar.groups" },
  { keys: ADMIN_NAVIGATION.flatMap(({ items }) => items.map(({ key }) => key)), labels: "pages.admin.sidebar.links" },
  { keys: ROLE_VALUES, labels: "pages.admin.users.filters.role.options" },
  { keys: Object.values(USER_STATUS), labels: "pages.admin.users.filters.status.options" },
  { keys: Object.values(LICENSE_STATUS), labels: "pages.app.overview.license" },
  { keys: APP_NAVIGATION.map(({ key }) => key), labels: "pages.app.sidebar.navigation" },
  { keys: Object.values(LESSON_ACCESS), labels: "pages.courses.access" },
  { keys: Object.values(COURSE_KIND), labels: "pages.courses.kinds" },
  { keys: Object.values(LESSON_ACCESS), labels: "pages.landing.studio.masterclass.access" },
  { keys: Object.values(COURSE_KIND), labels: "pages.landing.studio.masterclass.kinds" },
]

it.each(ENUM_LABELS)("labels every value shown from $labels in every locale", ({ keys, labels }) => {
  for (const locale of I18N.SUPPORTED_LOCALES) {
    const messages = getTestMessages(locale)

    for (const key of keys) {
      expect(messages).toHaveProperty(`${labels}.${key}`.split("."), expect.stringMatching(/\S/u))
    }
  }
})
