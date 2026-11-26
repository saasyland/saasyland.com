import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

const ADMIN_LIST = {
  spec: "admin-newsletter.spec.ts",
  title: "the admin finds a subscriber and exports the list to a CSV that keeps a formula-like address as text",
} as const

const ADMIN_SEND = {
  spec: "admin-newsletter.spec.ts",
  title:
    "the admin sends an issue in two languages, each confirmed subscriber gets it once in their language and can unsubscribe in one click",
} as const

const ROUND_TRIP = {
  spec: "newsletter.spec.ts",
  title: "localized newsletter signup, confirmation and unsubscribe survive hydration and refresh",
} as const

const RECIPIENT_LIMIT = {
  spec: "auth-limits.spec.ts",
  title: "auth limits › a reset or newsletter email over the hourly limit for one recipient is skipped without an error",
} as const

const CLIENT_LIMIT = {
  spec: "newsletter.spec.ts",
  title: "sign-ups from one client address past the limit are refused and send nothing, while another client address still signs up",
} as const

const RESUBSCRIBE = {
  spec: "newsletter.spec.ts",
  title: "an unsubscribed reader who signs up again gets a new confirmation email and is on the list again once they confirm it",
} as const

const IN_APP = {
  spec: "newsletter.spec.ts",
  title: "a signed-in customer turns the build log on and off from the settings in the page's language once the address is confirmed",
} as const

export const NEWSLETTER_FLOWS = [
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-subscribe",
    outcome: "A visitor subscribes from the footer, receives the confirmation email in the page's language and stays pending until they confirm",
    status: FLOW_STATUS.COVERED,
    tests: [ROUND_TRIP],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-confirm",
    outcome: "Opening the confirmation link and pressing Confirm subscribes the address and tells the owner once, also after a reload",
    status: FLOW_STATUS.COVERED,
    tests: [ROUND_TRIP],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
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
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-unsubscribe",
    outcome: "The unsubscribe link and its button unsubscribe the address, record when, and survive a reload",
    status: FLOW_STATUS.COVERED,
    tests: [ROUND_TRIP],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-invalid-unsubscribe",
    outcome: "An empty or invalid unsubscribe link says that the address could not be unsubscribed",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "newsletter.spec.ts", title: "/newsletter/unsubscribe" },
      { spec: "newsletter.spec.ts", title: "/pl-PL/newsletter/unsubscribe?token=invalid" },
    ],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-one-click-unsubscribe",
    outcome: "A mail client's own unsubscribe button posts to the issue's List-Unsubscribe address and unsubscribes the reader at once",
    status: FLOW_STATUS.COVERED,
    tests: [ADMIN_SEND],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "admin-newsletter-subscribers",
    outcome: "The admin opens Newsletter from the sidebar and finds a subscriber with their status, sign-up and confirmation days",
    status: FLOW_STATUS.COVERED,
    tests: [ADMIN_LIST],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "admin-newsletter-export",
    outcome: "The admin exports the subscribers to a CSV in which an address that starts like a formula stays text",
    status: FLOW_STATUS.COVERED,
    tests: [ADMIN_LIST],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "admin-newsletter-send",
    outcome:
      "The admin writes an issue in two languages with a preview, confirms, and each confirmed subscriber gets it once in their language while a pending address gets nothing",
    status: FLOW_STATUS.COVERED,
    tests: [ADMIN_SEND],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "admin-newsletter-resume",
    outcome: "An issue that stopped while sending is resumed from its row menu under Issues and sends each remaining email once",
    reason: "The browser suite cannot make the Resend double refuse a batch in the middle of an issue; send-newsletter-issue.test.ts covers the resume.",
    status: FLOW_STATUS.MISSING,
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-rate-limit",
    outcome:
      "Sign-ups from one client address past the limit within the window are refused with a message and send nothing, and confirmation emails to one address past the hourly limit are skipped",
    status: FLOW_STATUS.COVERED,
    tests: [CLIENT_LIMIT, RECIPIENT_LIMIT],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-resubscribe",
    outcome:
      "An unsubscribed address that subscribes again receives a new confirmation email, stays pending while the old link is spent, and is subscribed once it confirms",
    status: FLOW_STATUS.COVERED,
    tests: [RESUBSCRIBE],
  },
  {
    feature: FLOW_FEATURE.NEWSLETTER,
    id: "newsletter-in-app",
    outcome:
      "A signed-in customer whose address is confirmed turns the newsletter on and off in /app/settings without a confirmation email, in the page's language, and the choice survives a reload",
    status: FLOW_STATUS.COVERED,
    tests: [IN_APP],
  },
] as const satisfies readonly Flow[]
