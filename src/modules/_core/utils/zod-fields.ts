import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CURRENCY_CODES } from "~/src/modules/_core/constants/currency"

export const MIN_FIELD_LENGTH = 1

export const idField = zod.string().min(MIN_FIELD_LENGTH)

export const localeField = zod.enum(I18N.SUPPORTED_LOCALES)

export const currencyCodeField = zod.string().toUpperCase().pipe(zod.enum(CURRENCY_CODES))

export const SLUG_MAX_LENGTH = 96

export const slugField = zod
  .string()
  .max(SLUG_MAX_LENGTH, { message: "slugTooLong" })
  .regex(/^[\da-z]+(?:-[\da-z]+)*$/u, { message: "slugInvalid" })
