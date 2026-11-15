import { expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import * as AREA_LABELS from "~/src/integrations/use-intl/__test__/labels.entries"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

const ENUM_LABELS = Object.values(AREA_LABELS)
  .flat()
  .toSorted((first, second) => first.labels.localeCompare(second.labels))

it.each(ENUM_LABELS)("labels every value shown from $labels in every locale", ({ keys, labels }) => {
  for (const locale of I18N.SUPPORTED_LOCALES) {
    const messages = getTestMessages(locale)

    for (const key of keys) {
      expect(messages).toHaveProperty(`${labels}.${key}`.split("."), expect.stringMatching(/\S/u))
    }
  }
})
