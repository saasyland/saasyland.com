import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

const ROUND_TRIP = {
  spec: "newsletter.spec.ts",
  title: "localized newsletter signup, confirmation and unsubscribe survive hydration and refresh",
} as const

export const NEWSLETTER_FLOWS = [
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-subscribe",
    outcome: "A visitor subscribes from the footer, receives the confirmation email in the page's language and stays pending until they confirm",
    status: FLOW_STATUS.COVERED,
    tests: [ROUND_TRIP],
  },
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-confirm",
    outcome: "Opening the confirmation link and pressing Confirm subscribes the address and tells the owner once, also after a reload",
    status: FLOW_STATUS.COVERED,
    tests: [ROUND_TRIP],
  },
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-spent-link",
    outcome: "A used, empty or invalid confirmation link says that the link is spent and changes nothing",
    status: FLOW_STATUS.COVERED,
    tests: [
      ROUND_TRIP,
      { spec: "newsletter.spec.ts", title: "/newsletter/confirm" },
      { spec: "newsletter.spec.ts", title: "/pl-PL/newsletter/confirm?token=invalid" },
    ],
  },
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-unsubscribe",
    outcome: "The unsubscribe link and its button unsubscribe the address, record when, and survive a reload",
    status: FLOW_STATUS.COVERED,
    tests: [ROUND_TRIP],
  },
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-invalid-unsubscribe",
    outcome: "An empty or invalid unsubscribe link says that the address could not be unsubscribed",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "newsletter.spec.ts", title: "/newsletter/unsubscribe" },
      { spec: "newsletter.spec.ts", title: "/pl-PL/newsletter/unsubscribe?token=invalid" },
    ],
  },
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-rate-limit",
    outcome: "Sign-ups over the limit for one address within the window are refused",
    reason: "The spec subscribes once, from an address of its own.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-resubscribe",
    outcome: "An unsubscribed address that subscribes again receives a new confirmation email and is subscribed once it confirms",
    reason: "The spec ends after unsubscribing.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.NEWSLETTER,
    id: "newsletter-in-app",
    outcome: "A signed-in customer turns the newsletter on and off from /app",
    reason: "get-newsletter-subscription.ts and set-newsletter-subscription.ts have no screen.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
