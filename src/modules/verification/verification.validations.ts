import type { VerificationValidationMessageKey } from "~/src/integrations/use-intl/i18n.types"

export const VERIFICATION_VALIDATION_MESSAGE = {
  redirectToRequired: "redirectToRequired",
  tokenRequired: "tokenRequired",
} as const satisfies Record<string, VerificationValidationMessageKey>
