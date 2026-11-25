import { expect, it } from "vite-plus/test"

import { AUTH_LABELS } from "~/src/integrations/use-intl/__test__/auth.labels"
import { CONTENT_LABELS } from "~/src/integrations/use-intl/__test__/content.labels"
import { COURSES_LABELS } from "~/src/integrations/use-intl/__test__/courses.labels"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { LANDING_LABELS } from "~/src/integrations/use-intl/__test__/landing.labels"
import { LICENSE_LABELS } from "~/src/integrations/use-intl/__test__/license.labels"
import { PRODUCTS_LABELS } from "~/src/integrations/use-intl/__test__/products.labels"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { USER_STATUS } from "~/src/modules/user/user.constants"

import { FOOTER_SECTIONS } from "~/src/data/marketing"
import { ADMIN_NAVIGATION, FOOTER_NAVIGATION } from "~/src/data/navigation"

const ENUM_LABELS = [
  { keys: FOOTER_NAVIGATION.map(({ key }) => key), labels: "components.custom.footer.columns" },
  { keys: FOOTER_SECTIONS, labels: "components.custom.footer.links" },
  { keys: Object.values(ERROR_CODES), labels: "errors.codes" },
  { keys: Object.values(USER_STATUS), labels: "pages.admin.dashboard.users.table.status" },
  { keys: ADMIN_NAVIGATION.map(({ key }) => key), labels: "pages.admin.sidebar.groups" },
  ...AUTH_LABELS,
  ...CONTENT_LABELS,
  ...COURSES_LABELS,
  ...LANDING_LABELS,
  ...LICENSE_LABELS,
  ...PRODUCTS_LABELS,
].toSorted((first, second) => first.labels.localeCompare(second.labels))

it.each(ENUM_LABELS)("labels every value shown from $labels in every locale", ({ keys, labels }) => {
  for (const locale of I18N.SUPPORTED_LOCALES) {
    const messages = getTestMessages(locale)

    for (const key of keys) {
      expect(messages).toHaveProperty(`${labels}.${key}`.split("."), expect.stringMatching(/\S/u))
    }
  }
})
