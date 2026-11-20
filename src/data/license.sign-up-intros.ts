import { redirectTierSchema } from "~/src/data/license"
import type { SignUpIntro } from "~/src/data/sign-up-intros"

import { SignUpOrderSummary, SignUpOrderSummaryPending } from "~/src/presentation/components/custom/app/sign-up-order-summary"

export const LICENSE_SIGN_UP_INTROS = [
  {
    Intro: SignUpOrderSummary,
    Pending: SignUpOrderSummaryPending,
    appliesTo: (redirect) => redirectTierSchema.safeParse(redirect).success,
    key: "order-summary",
  },
] as const satisfies readonly SignUpIntro[]
