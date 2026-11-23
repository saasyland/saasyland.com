import { lazyRouteComponent } from "@tanstack/react-router"

import type { BrowserArea } from "~/src/areas/browser"

import { SignUpConsentPending } from "~/src/presentation/components/custom/legal-pending"

export const LEGAL_BROWSER = {
  accountDeletion: [
    {
      Notice: lazyRouteComponent(() => import("~/src/presentation/components/custom/account-deletion-records"), "AccountDeletionRecords"),
      key: "records",
      load: () => Promise.resolve(),
    },
  ],
  name: "legal",
  signUpNotices: [
    {
      Notice: lazyRouteComponent(() => import("~/src/presentation/components/custom/sign-up-consent"), "SignUpConsent"),
      Pending: SignUpConsentPending,
      key: "consent",
    },
  ],
} as const satisfies BrowserArea
