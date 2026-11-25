import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

export const LEGAL_FLOWS = [
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "legal-documents",
    outcome: "The privacy policy, the terms, the refund policy and the licence open from the footer in every language with their titles",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "locales.spec.ts", title: "en-US: canonical language, mobile layout, and all legal documents" },
      { spec: "legal.spec.ts", title: "/terms renders its legal document" },
      { spec: "legal.spec.ts", title: "/privacy renders its legal document" },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "sign-up-consent-links",
    outcome: "The sign-up form links the terms and the privacy policy it asks the visitor to accept",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "legal.spec.ts", title: "the sign-up consent links /terms" },
      { spec: "legal.spec.ts", title: "the sign-up consent links /privacy" },
    ],
  },
] as const satisfies readonly Flow[]
