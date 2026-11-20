import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

const BUY_COMPLETE = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a tier picked on the landing page survives sign-up, opens checkout once the buyer consents, and activates",
} as const

const SECOND_CHECKOUT = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a page left open after buying refuses a second checkout and shows the license instead",
} as const

const BUYER_PROFILE = {
  spec: "admin-users.spec.ts",
  title: "admin reads a buyer's licence, consent, first uses and refund terms on the profile",
} as const

const CLI_MACHINE = {
  spec: "cli-licence-api.spec.ts",
  title: "CLI licence API › activates, reuses, validates and releases a machine for the CLI through the Worker",
} as const

const CLI_BUNDLE = {
  spec: "cli-licence-api.spec.ts",
  title: "CLI licence API › signs a URL to a release's bundle that the Worker serves with the digest and size it promised",
} as const

const JOURNEY_STEP = {
  ACTIVATE: "activate this machine with the key",
  FILL_SLOTS: "CI machines fill the remaining slots and the next one is refused",
  FREE_SLOT: "free a CI slot on /app/license, and the refused machine takes it",
  KEY: "the webhooks issue the key on /app/license",
  ORDER: "Polar records the order of the tier",
  PAY: "pay the regional price with the Stripe test card",
  REFUND: "a refund in the Polar sandbox stops the key and removes the credentials",
} as const

const JOURNEY_ONLY = "Only the journey suite does this, against preview and the Polar sandbox, and no CI runs it yet."

export const LICENSE_FLOWS = [
  {
    area: FLOW_AREA.PURCHASE,
    id: "tier-from-landing-survives-sign-up",
    outcome: "A signed-out visitor who picks a tier on the landing page signs up, verifies the address and lands on the offer of that tier",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "tier-from-landing-signed-in",
    outcome: "A signed-in admin or customer who picks a tier on the landing page goes straight to its offer",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "checkout-funnel.spec.ts", title: "checkout funnel › a signed-in admin who picks a tier on the landing page skips sign-in and opens the offer" },
      {
        spec: "checkout-funnel.spec.ts",
        title: "checkout funnel › a signed-in customer who picks a tier on the landing page skips sign-in and opens the offer",
      },
    ],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "consent-required",
    outcome: "Checkout starts only once the buyer ticks the consent to immediate supply; without it the dialog says why and the page stays",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "checkout-funnel.spec.ts",
        title: "checkout funnel › checkout starts only once the buyer ticks the consent to immediate supply, and the dialog says why",
      },
    ],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "buy-complete",
    outcome:
      "A buyer consents and checks out Complete, and once order.paid arrives the page says the licence is active, the confirmation email arrives and /app/license shows Complete",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "buy-core",
    outcome: "A buyer consents and checks out Core, and ends with an active Core licence, its confirmation email and Core on /app/license",
    journey: JOURNEY_STEP.PAY,
    reason: "The browser suite checks out Complete only; a Core licence is granted by a webhook without a checkout.",
    status: FLOW_STATUS.MISSING,
    tests: [SECOND_CHECKOUT],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "buy-agency",
    outcome: "A buyer consents and checks out Agency, and ends with an active Agency licence, its confirmation email and Agency on /app/license",
    journey: JOURNEY_STEP.PAY,
    reason: "The browser suite never checks out Agency.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "checkout-full-price",
    outcome: "Outside the regional-pricing countries, the checkout Polar receives for each tier charges its full price from TIER_PRICES",
    journey: JOURNEY_STEP.ORDER,
    reason: "The browser suite never reads the product, amount or discount of the checkout the Polar double receives.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "checkout-regional-price",
    outcome:
      "A buyer in a regional-pricing country who keeps the offer is charged the regional price at checkout, and one who declines it the full price",
    journey: JOURNEY_STEP.ORDER,
    reason: "The browser suite checks the regional price on the landing page only; it never reads the discount on the checkout.",
    status: FLOW_STATUS.MISSING,
    tests: [{ spec: "regional-pricing.spec.ts", title: "shows the regional price next to the struck-through regular price and remembers a decline" }],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "regional-price-display",
    outcome:
      "A visitor from a regional-pricing country sees the regional price beside the struck-through full price, can decline it, and the choice survives a reload and a client-side visit",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "regional-pricing.spec.ts", title: "shows the regional price next to the struck-through regular price and remembers a decline" },
      { spec: "regional-pricing.spec.ts", title: "keeps regional pricing on a client-side visit to the landing page" },
    ],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "checkout-prefilled",
    outcome: "The Polar checkout opens with the account's email, the buyer's locale and the account as Polar's external customer",
    journey: JOURNEY_STEP.PAY,
    reason: "The Polar double answers the checkout without the browser suite reading what it was sent.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "consent-reaches-polar",
    outcome: "The consent ticked on the site reaches Polar as the order's withdrawal-consent field and is stored on the licence",
    journey: JOURNEY_STEP.ORDER,
    reason: "The browser suite writes the consent into a webhook it signs itself; only the journey reads it back from Polar.",
    status: FLOW_STATUS.MISSING,
    tests: [BUYER_PROFILE],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "order-paid-grants-licence",
    outcome: "A signed order.paid webhook for a licence product creates an active licence of that tier for the account named as the external customer",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE, BUYER_PROFILE],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "key-issued",
    outcome: "The key from the benefit_grant.created webhook appears on /app/license with the CLI commands and no machine in use",
    journey: JOURNEY_STEP.KEY,
    reason: "The browser suite sends order.paid only; the seeded licences hold their keys from the seed, not from a webhook.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "confirmation-with-consent",
    outcome: "With the consent, the purchase confirmation names the tier and says that the right of withdrawal does not apply",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "confirmation-without-consent",
    outcome: "Without the consent, the purchase confirmation states the right of withdrawal and its period",
    reason: "The browser suite reads the confirmation of an order with the consent only.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "activation-pending",
    outcome:
      "Back from the checkout before the webhook, the buyer sees Payment received, and after a minute without the licence a message with the contact email, the checkout reference and Check again",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "checkout-funnel.spec.ts", title: "checkout funnel › a slow activation ends in an honest message with the contact email and checkout reference" },
      { spec: "checkout-funnel.spec.ts", title: "checkout funnel › a browser clock five minutes behind the server hydrates the activation the server rendered" },
    ],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "second-checkout-refused",
    outcome: "An account with an active licence that opens another checkout is refused and shown its licence, and the landing page no longer offers it checkout",
    status: FLOW_STATUS.COVERED,
    tests: [SECOND_CHECKOUT],
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "webhook-duplicate",
    outcome: "A second delivery of the same order.paid leaves one licence and sends one confirmation email",
    reason: "Every spec delivers each webhook once.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "webhook-out-of-order",
    outcome: "A benefit_grant.created that arrives before its order.paid still ends with one active licence holding the key",
    reason: "No spec sends benefit_grant.created.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "unmatched-order-alert",
    outcome: "An order.paid whose customer maps to no account grants nothing and emails the owner an alert with the order and the tier",
    reason: "The dashboard spec reads a seeded unlicensed order; no spec sends such a webhook or reads the alert.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.PURCHASE,
    id: "non-licence-order",
    outcome: "An order.paid for a product that is not a licence grants no licence",
    reason: "Every order the specs deliver is for a licence product.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.SECURITY,
    id: "webhook-signature",
    outcome: "A Polar webhook with a missing or wrong signature is refused and changes nothing",
    reason: "deliverPaidOrder always signs with the test secret.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.I18N,
    id: "localized-checkout",
    outcome: "A buyer on /pl-PL is sent to the Polar checkout in Polish and receives the purchase confirmation in Polish",
    reason: "Every checkout in the specs starts from an English page.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.I18N,
    id: "localized-dates",
    outcome: "Every locale shows the licence's dates and times as the server printed them, without a hydration mismatch",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "license.spec.ts", title: "display preferences › every locale hydrates the date and time the server printed" }],
  },
  {
    area: FLOW_AREA.AFTER_SALE,
    id: "refund-revokes",
    outcome: "An order.refunded webhook marks the licence refunded, /app/license says the key no longer works, and the CLI is refused with licenseRefunded",
    journey: JOURNEY_STEP.REFUND,
    reason: JOURNEY_ONLY,
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.AFTER_SALE,
    id: "partial-refund-keeps-licence",
    outcome: "A partially refunded order keeps its licence active",
    reason: "No spec sends order.refunded.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.AFTER_SALE,
    id: "benefit-revoked",
    outcome: "A benefit_grant.revoked webhook marks the licence revoked, /app/license says so, and the CLI is refused with licenseRevoked",
    reason: "No spec sends benefit_grant.revoked.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.AFTER_SALE,
    id: "chargeback",
    outcome: "A chargeback revokes the licence, and the CLI is refused",
    reason:
      "No code handles Polar's dispute events; a lost dispute reaches the licence only if Polar also sends order.refunded or benefit_grant.revoked.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.AFTER_SALE,
    id: "first-use-recorded",
    outcome:
      "The first CLI activation and the first template download are recorded on the licence and shown on the buyer's profile, with the refund terms that follow from them",
    reason: "The profile spec reads Never before any use; no spec activates or downloads and reads the dates back.",
    status: FLOW_STATUS.MISSING,
    tests: [BUYER_PROFILE],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-unlicensed-orders",
    outcome: "The admin dashboard lists the paid licence orders without a licence, with the customer, the amount and a link to the order in Polar",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "license.spec.ts", title: "admin finds a paid licence order without a licence on the dashboard, linked to the order in Polar" }],
  },
  {
    area: FLOW_AREA.LICENCE,
    id: "licence-navigation",
    outcome: "A customer opens Licence from the app navigation and from the phone sidebar, in English and Polish",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "license.spec.ts", title: "customer opens the licence from the app navigation in English and Polish" },
      { spec: "license.spec.ts", title: "customer opens the licence from the mobile app sidebar and signing out protects it" },
    ],
  },
  {
    area: FLOW_AREA.LICENCE,
    id: "licence-offer",
    outcome: "An account without a licence sees Get your licence instead of a key",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "license.spec.ts", title: "customer opens the licence from the app navigation in English and Polish" },
      {
        spec: "license.spec.ts",
        title:
          "cached data when the account changes › a client navigation after another account signs in shows that account's licence, not the previous one's",
      },
    ],
  },
  {
    area: FLOW_AREA.LICENCE,
    id: "licence-on-overview",
    outcome: "The /app overview shows a licence holder their tier and the licence's status, with a link to /app/license",
    reason: "The overview specs sign in as accounts without a licence.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.LICENCE,
    id: "licence-prices",
    outcome: "The offer on /app/license shows each tier's full price, or its regional price in a regional-pricing country",
    journey: JOURNEY_STEP.PAY,
    reason: "The browser suite never reads the prices on /app/license.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.LICENCE,
    id: "licence-key-and-machines",
    outcome: "A licence holder sees the key and each machine with its label and activation time",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "license.spec.ts", title: "display preferences › a saved time zone moves every time in the app and names the zone" },
      {
        spec: "license.spec.ts",
        title: "cached data when the account changes › signing out and signing in as another account leaves none of the first account's data",
      },
    ],
  },
  {
    area: FLOW_AREA.LICENCE,
    id: "free-slot",
    outcome: "Freeing a machine's slot on /app/license lowers the count, and that machine is then refused with activationNotFound",
    journey: JOURNEY_STEP.FREE_SLOT,
    reason: JOURNEY_ONLY,
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.LICENCE,
    id: "upgrade-tier",
    outcome: "A licence holder moves to a higher tier and pays the difference",
    reason: "The site refuses a second checkout and asks the holder to write; there is no upgrade checkout.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-activate-reuse-release",
    outcome:
      "With a valid key a machine activates, activating again keeps its slot, validate succeeds, deactivate frees the slot, and validate then answers activationNotFound",
    status: FLOW_STATUS.COVERED,
    tests: [CLI_MACHINE],
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-read-licence",
    outcome: "The licence endpoint returns the tier, the machine limit, the machines in use and which of them is the caller",
    status: FLOW_STATUS.COVERED,
    tests: [CLI_MACHINE],
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-bundle-download",
    outcome:
      "The bundle endpoint signs a URL to the release's archive, the Worker serves exactly those bytes with the promised SHA-256 and size, a tampered path is refused and an unreleased version answers versionNotFound",
    status: FLOW_STATUS.COVERED,
    tests: [CLI_BUNDLE],
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-bundle-every-answer",
    outcome: "The bundle endpoint accepts every answer the published CLI can send, not only the defaults",
    reason: "The spec sends STACK_DEFAULTS only; production init failed on the library answer while every suite passed.",
    status: FLOW_STATUS.MISSING,
    tests: [CLI_BUNDLE],
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-unknown-key",
    outcome: "A key the site never issued is refused with invalidLicenseKey",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "cli-licence-api.spec.ts", title: "CLI licence API › refuses a key the site never issued" }],
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-slot-limit",
    outcome: "The machine after the tier's limit is refused with activationLimitReached and stores no credentials",
    journey: JOURNEY_STEP.FILL_SLOTS,
    reason: JOURNEY_ONLY,
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-ci-slots",
    outcome: "A CI machine named by its repository takes one slot for that repository and keeps it on every run",
    journey: JOURNEY_STEP.FILL_SLOTS,
    reason: JOURNEY_ONLY,
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-refunded-key",
    outcome: "The key of a refunded licence is refused with licenseRefunded, and the CLI removes its credentials",
    journey: JOURNEY_STEP.REFUND,
    reason: JOURNEY_ONLY,
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-revoked-key",
    outcome: "The key of a revoked licence is refused with licenseRevoked",
    reason: "No spec revokes a licence.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-rate-limit",
    outcome: "Requests over the limit for one address or one key within the period are refused with rateLimited and a Retry-After",
    reason: "Every request of the spec comes from an address of its own.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-invalid-request",
    outcome: "A malformed request is refused with invalidRequest",
    reason: "Every request of the spec is well formed.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-polar-unavailable",
    outcome: "When Polar cannot be reached, the API answers serviceUnavailable with a Retry-After",
    reason: "The Polar double always answers.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-published-commands",
    outcome:
      "The published CLI activates with the key and writes its credentials, whoami shows the machine, and deactivate frees the slot and removes the credentials",
    journey: JOURNEY_STEP.ACTIVATE,
    reason: "The browser suite calls the API through the contract package, not the published CLI; only the journey runs the CLI.",
    status: FLOW_STATUS.MISSING,
    tests: [CLI_MACHINE],
  },
  {
    area: FLOW_AREA.CLI_API,
    id: "cli-init-project",
    outcome: "The published CLI's init, with an activated licence, downloads the bundle for the chosen answers and writes the project",
    reason: "No suite runs init against the site; the journey stops at the licence commands.",
    status: FLOW_STATUS.MISSING,
  },
] as const satisfies readonly Flow[]
