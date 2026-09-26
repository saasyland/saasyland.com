import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

export const MIN_FIELD_LENGTH = 1

export const idField = zod.string().min(MIN_FIELD_LENGTH)

export const localeField = zod.enum(I18N.SUPPORTED_LOCALES)
