import type { SessionValidationMessageKey } from "~/src/integrations/use-intl/i18n.types"

export const SESSION_VALIDATION_MESSAGE = {
  tokenRequired: "tokenRequired",
} as const satisfies Record<string, SessionValidationMessageKey>
