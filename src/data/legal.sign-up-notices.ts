import type { SignUpNotice } from "~/src/data/sign-up-notices"

import { SignUpConsent, SignUpConsentPending } from "~/src/presentation/components/custom/sign-up-consent"

export const LEGAL_SIGN_UP_NOTICES = [
  { Notice: SignUpConsent, Pending: SignUpConsentPending, key: "consent" },
] as const satisfies readonly SignUpNotice[]
