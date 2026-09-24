import type { UserValidationMessageKey } from "~/src/integrations/use-intl/i18n.types"

export const USER_VALIDATION_MESSAGE = {
  atLeastOneFieldRequired: "atLeastOneFieldRequired",
} as const satisfies Record<string, UserValidationMessageKey>
