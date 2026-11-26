import { LICENSE_TIER, type LicenseTier } from "../../src/modules/license/license.constants"
import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

const BUY_COMPLETE = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a tier picked on the landing page goes from sign-up straight to checkout, and the key, the billing portal and paid lessons wait for the confirmed email",
} as const

const CHECKOUT_LANGUAGE = {
  spec: "checkout-funnel.spec.ts",
  title:
    "checkout funnel › opens Polar's checkout over the page without a dialog of its own, in the buyer's language, with a back button and the consent box left for the buyer",
} as const

const CHECKOUT_CLOSED = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › closing Polar's checkout without paying leaves the buyer where they were, with the button ready and focused",
} as const

const CHECKOUT_REFUSED = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a browser that cannot show Polar's checkout over the page goes to Polar's checkout page instead",
} as const

const CHECKOUT_HOSTED_PAID = {
  spec: "checkout-funnel.spec.ts",
  title:
    "checkout funnel › a buyer who pays on Polar's own checkout page comes back without Polar's customer session token in any address, signed in or not",
} as const

const KEY_ARRIVES_IN_PLACE = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a key that arrives while the licence page is open shows its machine limit at once, without a reload",
} as const

const CHECKOUT_POLICY = {
  spec: "content-security-policy.spec.ts",
  title: "content security policy › a customer pays in Polar's checkout over the workspace under its policy, which frames only Polar's checkout",
} as const

const purchaseTest = (tier: LicenseTier) =>
  ({
    spec: "checkout-funnel.spec.ts",
    title: `checkout funnel › a ${tier} purchase grants the licence and its key, and its email says how to start`,
  }) as const

const BUY_CORE = purchaseTest(LICENSE_TIER.CORE)

const BUY_COMPLETE_WITH_KEY = purchaseTest(LICENSE_TIER.COMPLETE)

const BUY_AGENCY = purchaseTest(LICENSE_TIER.AGENCY)

const REGIONAL_CHECKOUT = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a buyer from a regional-price country pays the whole-dollar price the cards show, or the full price after declining it",
} as const

const UPGRADE = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a Core owner who picks Complete pays the difference and keeps the key, now with Complete's machines",
} as const

const fullPriceCheckout = (tier: LicenseTier) =>
  ({
    spec: "checkout-funnel.spec.ts",
    title: `checkout funnel › a ${tier} checkout charges the full price to the signed-in account, and the ticked consent ends in an active ${tier} licence and its confirmation`,
  }) as const

const FULL_PRICE_CHECKOUTS = [
  fullPriceCheckout(LICENSE_TIER.CORE),
  fullPriceCheckout(LICENSE_TIER.COMPLETE),
  fullPriceCheckout(LICENSE_TIER.AGENCY),
] as const

const POLISH_CHECKOUT = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a buyer on the Polish site checks out in Polish and receives the purchase confirmation in Polish",
} as const

const webhookTest = (title: string) => ({ spec: "license-webhooks.spec.ts", title: `licence webhooks › ${title}` }) as const

const cliApiTest = (title: string) => ({ spec: "cli-licence-api.spec.ts", title: `CLI licence API › ${title}` }) as const

const REFUND_STOPS_KEY = webhookTest("a refund stops the key: the licence page says so and the CLI licence API refuses it with licenseRefunded")

const REVOKED_KEY = webhookTest("a revoked licence key marks the licence inactive, and the CLI licence API refuses the key with licenseRevoked")

const publishedCliTest = (title: string) => ({ spec: "published-cli.spec.ts", title: `published CLI › ${title}` }) as const

const SLOT_LIMIT = cliApiTest("refuses the machine after the tier's limit with activationLimitReached and the machines that hold the slots")

const SECOND_CHECKOUT = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a page left open after buying refuses a second checkout and shows the license instead",
} as const

const FIRST_USE_LESSON = {
  spec: "withdrawal.spec.ts",
  title: "withdrawal function › a buyer who opens a paid lesson has used the purchase from that moment, and a free preview does not count",
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

const REFUNDED_LICENCE = {
  spec: "checkout-funnel.spec.ts",
  title: "checkout funnel › a refunded licence says so without its key, commands or a pending key, and offers a new one",
} as const

const WITHDRAWAL_SIGNED_OUT = {
  spec: "withdrawal.spec.ts",
  title:
    "withdrawal function › a signed-out buyer withdraws through the link in the purchase confirmation and gets the acknowledgement by email",
} as const

const WITHDRAWAL_SIGNED_IN = {
  spec: "withdrawal.spec.ts",
  title:
    "withdrawal function › a signed-in buyer withdraws from the licence page with the account's details filled in, and the admin sees the statement",
} as const

const WITHDRAWAL_LINKS = {
  spec: "withdrawal.spec.ts",
  title: "withdrawal function › the footer of every page and the Refund Policy lead to the withdrawal function",
} as const

export const LICENSE_FLOWS = [
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "tier-from-landing-survives-sign-up",
    outcome: "A signed-out visitor who picks a tier on the landing page signs up and lands on the offer of that tier at once, without visiting the inbox",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "tier-summary-on-sign-up",
    outcome:
      "Sign-up opened with a tier in its return path shows that tier, its price, the two steps to buying it and the refund terms in place of the description, and without a tier keeps the description",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "sign-up-order-summary.spec.ts",
        title: "sign-up order summary › a tier in the redirect sums up the order with the price from TIER_PRICES in place of the description",
      },
      { spec: "sign-up-order-summary.spec.ts", title: "sign-up order summary › without a tier the page keeps the description" },
    ],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
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
    feature: FLOW_FEATURE.PURCHASE,
    id: "consent-required",
    outcome:
      "A tier button opens Polar's checkout straight away over the page, without a dialog of the site, and the consent to immediate supply is the box on Polar's page that the site leaves empty for the buyer",
    status: FLOW_STATUS.COVERED,
    tests: [CHECKOUT_LANGUAGE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-overlay-paid",
    outcome:
      "A buyer who pays in Polar's checkout over the page lands on Payment received and the Get started steps without a reload, under a policy that frames only Polar's checkout",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE, CHECKOUT_POLICY],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-overlay-closed",
    outcome:
      "A buyer who closes Polar's checkout without paying stays on the page they were on, with focus back on the button they pressed and the button ready again",
    status: FLOW_STATUS.COVERED,
    tests: [CHECKOUT_CLOSED],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-overlay-refused",
    outcome:
      "When Polar refuses to open its checkout over the page, the button takes the buyer to Polar's own checkout page for the same checkout",
    status: FLOW_STATUS.COVERED,
    tests: [CHECKOUT_REFUSED],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-hosted-paid",
    outcome:
      "A buyer who pays on Polar's own checkout page comes back to Payment received at an address without the customer session token Polar appends, and a signed-out buyer signs in through a link that does not carry it either",
    status: FLOW_STATUS.COVERED,
    tests: [CHECKOUT_HOSTED_PAID],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "unconfirmed-buyer-gates",
    outcome:
      "A buyer who paid before confirming the address sees no key and no paid lesson until the link is opened, and the customer portal refuses them",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "buy-complete",
    outcome:
      "A buyer consents and checks out Complete, and once order.paid arrives the page says the licence is active, the confirmation email arrives and /app/license shows Complete",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "buy-core",
    outcome: "A buyer consents and checks out Core, and ends with an active Core licence, its confirmation email and Core on /app/license",
    status: FLOW_STATUS.COVERED,
    tests: [fullPriceCheckout(LICENSE_TIER.CORE), SECOND_CHECKOUT, BUY_CORE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "buy-agency",
    outcome: "A buyer consents and checks out Agency, and ends with an active Agency licence, its confirmation email and Agency on /app/license",
    status: FLOW_STATUS.COVERED,
    tests: [fullPriceCheckout(LICENSE_TIER.AGENCY), BUY_AGENCY],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-full-price",
    outcome: "Outside the regional-pricing countries, the checkout Polar receives for each tier charges its full price from TIER_PRICES",
    status: FLOW_STATUS.COVERED,
    tests: [...FULL_PRICE_CHECKOUTS],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-regional-price",
    outcome:
      "A buyer in a regional-pricing country who keeps the offer is charged the whole-dollar regional price the cards show at checkout, and one who declines it the full price",
    status: FLOW_STATUS.COVERED,
    tests: [REGIONAL_CHECKOUT],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "pricing-trust",
    outcome:
      "The landing page anchors the Core price, lifetime updates and the refund period under the hero, marks the recommended tier, and says under the tiers who sells, how tax works, when a refund applies and that the CLI is in beta",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "regional-pricing.spec.ts",
        title: "anchors the regional price under the hero and says under the tiers who sells, how tax works, the refund and the beta",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "tier-structured-data",
    outcome: "The prerendered landing page describes each tier to search engines as a product whose offer carries its regular price in the currency the page shows",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "regional-pricing.spec.ts",
        title: "the prerendered landing page describes each tier as a product at its regular price in the currency the page shows",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
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
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-prefilled",
    outcome: "The Polar checkout opens with the account's email, the buyer's locale and the account as Polar's external customer",
    status: FLOW_STATUS.COVERED,
    tests: [...FULL_PRICE_CHECKOUTS, CHECKOUT_LANGUAGE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "consent-reaches-polar",
    outcome: "The consent the buyer ticks on Polar's checkout reaches the order's withdrawal-consent field and is stored on the licence",
    status: FLOW_STATUS.COVERED,
    tests: [...FULL_PRICE_CHECKOUTS, BUYER_PROFILE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "order-paid-grants-licence",
    outcome: "A signed order.paid webhook for a licence product creates an active licence of that tier for the account named as the external customer",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE, BUYER_PROFILE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "key-issued",
    outcome: "The key from the benefit_grant.created webhook appears on /app/license with the CLI commands, each with a copy button",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_CORE, BUY_COMPLETE_WITH_KEY, BUY_AGENCY],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "key-arrives-in-place",
    outcome: "A key that arrives while /app/license is open appears there with its machine limit, without a reload and without a limit of zero",
    status: FLOW_STATUS.COVERED,
    tests: [KEY_ARRIVES_IN_PLACE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "confirmation-get-started",
    outcome:
      "The purchase confirmation says how to start, with the licence page, the activate and init commands and the CLI guide, and links the courses for Complete and Agency only",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_CORE, BUY_COMPLETE_WITH_KEY, BUY_AGENCY],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "confirmation-with-consent",
    outcome: "With the consent, the purchase confirmation names the tier and says that the right of withdrawal does not apply",
    status: FLOW_STATUS.COVERED,
    tests: [BUY_COMPLETE],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "confirmation-without-consent",
    outcome: "Without the consent, the purchase confirmation states the right of withdrawal and its period",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("without the consent, the purchase confirmation states the right of withdrawal and its period")],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "activation-pending",
    outcome:
      "After paying, before the webhook, the buyer sees Payment received, and after a minute without the licence a message with the contact email, the checkout reference and Check again",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "checkout-funnel.spec.ts", title: "checkout funnel › a slow activation ends in an honest message with the contact email and checkout reference" },
      { spec: "checkout-funnel.spec.ts", title: "checkout funnel › a browser clock five minutes behind the server hydrates the activation the server rendered" },
    ],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "second-checkout-refused",
    outcome:
      "An account with an active licence that opens another checkout for its own or a lower tier is refused and shown its licence, and the landing page no longer offers it checkout",
    status: FLOW_STATUS.COVERED,
    tests: [SECOND_CHECKOUT],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "webhook-duplicate",
    outcome: "A second delivery of the same order.paid leaves one licence and sends one confirmation email",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("a second delivery of the same order.paid leaves one licence with its key and sends one confirmation")],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "webhook-out-of-order",
    outcome: "A benefit_grant.created that arrives before its order.paid still ends with one active licence holding the key",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("a key granted before its order.paid is refused until the order arrives, and Polar's retry then attaches it")],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "unmatched-order-alert",
    outcome: "An order.paid whose customer maps to no account grants nothing and emails the owner an alert with the order and the tier",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("an order.paid whose customer has no account grants nothing and emails the owner the order and its tier")],
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "non-licence-order",
    outcome: "An order.paid for a product that is not a licence grants no licence",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("an order.paid for a product that is not a licence grants no licence and sends no confirmation")],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "webhook-signature",
    outcome: "A Polar webhook with a missing or wrong signature is refused and changes nothing",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("a Polar webhook with a missing or wrong signature is refused and changes nothing")],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "localized-checkout",
    outcome: "A buyer on /pl-PL gets the Polar checkout in Polish and receives the purchase confirmation in Polish",
    status: FLOW_STATUS.COVERED,
    tests: [POLISH_CHECKOUT, CHECKOUT_LANGUAGE],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "localized-dates",
    outcome: "Every locale shows the licence's dates and times as the server printed them, without a hydration mismatch",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "license.spec.ts", title: "display preferences › every locale hydrates the date and time the server printed" }],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "refund-revokes",
    outcome: "An order.refunded webhook marks the licence refunded, /app/license says the key no longer works, and the CLI is refused with licenseRefunded",
    status: FLOW_STATUS.COVERED,
    tests: [REFUND_STOPS_KEY, REFUNDED_LICENCE],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "refunded-licence-page",
    outcome: "A refunded licence on /app/license says so without the key, the commands or a pending key, and offers a new licence and support",
    status: FLOW_STATUS.COVERED,
    tests: [REFUNDED_LICENCE],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "partial-refund-keeps-licence",
    outcome: "A partially refunded order keeps its licence active",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("a partial refund keeps the licence active and its key working")],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "withdrawal-signed-out",
    outcome:
      "A signed-out buyer follows Withdraw from contract here from the purchase confirmation, gives a name, the email address for the acknowledgement and the order number, presses Confirm withdrawal, sees the receipt with the time it arrived, and receives the acknowledgement with the statement and its time by email, while the site's contact address is told which licence it concerns",
    status: FLOW_STATUS.COVERED,
    tests: [WITHDRAWAL_SIGNED_OUT],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "withdrawal-signed-in",
    outcome:
      "A signed-in buyer opens Withdraw from contract here on /app/license, which says whether the right still applies, finds the account's name, email address and order number filled in, presses Confirm withdrawal, sees the receipt and then the time the statement arrived on the card, receives the acknowledgement, and the admin sees the statement on the buyer's profile",
    status: FLOW_STATUS.COVERED,
    tests: [WITHDRAWAL_SIGNED_IN],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "first-use-paid-lesson",
    outcome:
      "A buyer whose licence unlocks the courses opens a free preview, and the withdrawal card on /app/license still offers the full refund before first use; after they open a paid lesson, the card says they first used the purchase then, by opening a paid lesson",
    status: FLOW_STATUS.COVERED,
    tests: [FIRST_USE_LESSON],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "withdrawal-links",
    outcome: "The footer of every public page and the Refund Policy link Withdraw from contract here to /withdrawal",
    status: FLOW_STATUS.COVERED,
    tests: [WITHDRAWAL_LINKS],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "withdrawal-unmatched",
    outcome:
      "A statement whose order number and email address match no active licence is still stored and acknowledged, and the site's contact address is asked to find the order by hand",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "withdrawal.spec.ts",
        title:
          "withdrawal function › a statement whose order number and email address match no licence is still acknowledged, and the contact address is asked to find the order by hand",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "withdrawal-localized",
    outcome: "A statement sent from a page in another language gets its acknowledgement of receipt in that language",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "withdrawal.spec.ts",
        title: "withdrawal function › a statement sent from the Polish page gets its acknowledgement of receipt in Polish",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "benefit-revoked",
    outcome: "A benefit_grant.revoked webhook marks the licence revoked, /app/license says so, and the CLI is refused with licenseRevoked",
    status: FLOW_STATUS.COVERED,
    tests: [REVOKED_KEY],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "chargeback",
    outcome: "A chargeback revokes the licence, and the CLI is refused",
    reason:
      "No code handles Polar's dispute events; a lost dispute reaches the licence only if Polar also sends order.refunded or benefit_grant.revoked.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "first-use-recorded",
    outcome:
      "The first CLI activation and the first template download are recorded on the licence and shown on the buyer's profile, with the refund terms that follow from them",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-users.spec.ts",
        title: "admin reads the first CLI activation and the first template download on the buyer's profile, and the refund terms they end",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_PAYMENTS,
    id: "admin-unlicensed-orders",
    outcome: "The admin dashboard lists the paid licence orders without a licence, with the customer, the amount and a link to the order in Polar",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "license.spec.ts", title: "admin finds a paid licence order without a licence on the dashboard, linked to the order in Polar" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-licence-machines",
    outcome:
      "The customers tab counts the machines each licence has activated in Polar against its limit and lists them with their system, and the profile's licence card lists the same machines",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-licence-machines.spec.ts",
        title: "the customers tab and the profile show the machines a licence has activated in Polar, with their system",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-licence-opened-lesson",
    outcome: "The profile's licence card names the first paid lesson the licence opened and its course under the time it was opened",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-licence-machines.spec.ts",
        title: "the profile's licence card names the first paid lesson the licence opened and its course",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-licence-machines-polar-unavailable",
    outcome: "A licence whose key Polar does not answer for keeps its card and machine limit and says Polar could not be reached",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-licence-machines.spec.ts",
        title: "a licence whose key Polar does not answer for keeps its card and says Polar could not be reached",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_PAYMENTS,
    id: "admin-licence-counts",
    outcome: "The admin dashboard counts the licences of each tier in D1 by status: active, revoked and refunded",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-dashboard.spec.ts",
        title:
          "the dashboard counts each tier's licences by status, the seeded revoked ones exactly and the active and refunded ones purchases add to",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "licence-navigation",
    outcome: "A customer opens Licence from the app navigation and from the phone sidebar, in English and Polish",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "license.spec.ts", title: "customer opens the licence from the app navigation in English and Polish" },
      { spec: "license.spec.ts", title: "customer opens the licence from the mobile app sidebar and signing out protects it" },
    ],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "licence-offer",
    outcome: "An account without a licence sees Get your licence instead of a key",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "license.spec.ts", title: "customer opens the licence from the app navigation in English and Polish" },
      {
        spec: "license.spec.ts",
        title:
          "cached data when the account changes › a client navigation once the cached session is stale after another account signs in shows that account's licence, not the previous one's",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "licence-on-overview",
    outcome: "The /app overview shows a licence holder their tier and the licence's status, with a link to /app/license",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "license.spec.ts",
        title: "a licence holder › sees the tier and the status of the licence on the overview, with a link to the licence page",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "licence-prices",
    outcome: "The offer on /app/license shows each tier's full price, or its regional price in a regional-pricing country",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "license.spec.ts", title: "the licence offer › shows each tier's full price outside the regional-pricing countries" },
      {
        spec: "license.spec.ts",
        title: "the licence offer › in a regional-pricing country › shows each tier's regional price beside its struck-through full price",
      },
      REGIONAL_CHECKOUT,
    ],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
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
    feature: FLOW_FEATURE.LICENCE,
    id: "first-steps",
    outcome:
      "After a purchase, the overview lists the steps to a first project with a button to copy each command, and the steps tick off as the key is copied, activated and used to generate a project",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "checkout-funnel.spec.ts",
        title: "checkout funnel › the first steps tick off as the buyer copies the key, activates it and generates a project",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "free-slot",
    outcome: "Freeing a machine's slot on /app/license lowers the count, and that machine is then refused with activationNotFound",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "license.spec.ts",
        title:
          "a licence holder › frees a machine's slot on the licence page, which lowers the count, and that machine is then refused with activationNotFound",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "upgrade-tier",
    outcome:
      "A Core holder opens the upgrade to Complete from the licence page, pays the higher tier's price less what the order copies in D1 say was paid, and keeps the same key with Complete's machine limit",
    status: FLOW_STATUS.COVERED,
    tests: [UPGRADE],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "upgrade-price-older-order",
    outcome:
      "A holder whose licence order was copied before the copy kept its subtotal, net amount and refunded tax is offered the same upgrade price, read from Polar until orders:backfill-amounts has filled the copy",
    reason:
      "The browser suite migrates its database before it copies any order, so every copy it holds has its amounts; license.upgrade-price.test.ts covers the read from Polar and its failure.",
    status: FLOW_STATUS.MISSING,
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "upgrade-activation",
    outcome:
      "After paying an upgrade the page says Payment received until the higher tier applies and then thanks the buyer for that tier, never for the one they had",
    status: FLOW_STATUS.COVERED,
    tests: [UPGRADE],
  },
  {
    feature: FLOW_FEATURE.LICENCE,
    id: "upgrade-refunded",
    outcome: "A full refund of an upgrade order puts the licence back on its earlier tier and machine limit",
    status: FLOW_STATUS.COVERED,
    tests: [webhookTest("a full refund of an upgrade puts the licence back on Core and its machine limit, and the key still works")],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-activate-reuse-release",
    outcome:
      "With a valid key a machine activates, activating again keeps its slot, validate succeeds, deactivate frees the slot, and validate then answers activationNotFound",
    status: FLOW_STATUS.COVERED,
    tests: [CLI_MACHINE],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-read-licence",
    outcome: "The licence endpoint returns the tier, the machine limit, the machines in use and which of them is the caller",
    status: FLOW_STATUS.COVERED,
    tests: [CLI_MACHINE],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-bundle-download",
    outcome:
      "The bundle endpoint signs a URL to the release's archive, the Worker serves exactly those bytes with the promised SHA-256 and size, a tampered path is refused and an unreleased version answers versionNotFound",
    status: FLOW_STATUS.COVERED,
    tests: [CLI_BUNDLE],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-bundle-every-answer",
    outcome: "The bundle endpoint accepts every answer the published CLI can send, not only the defaults",
    status: FLOW_STATUS.COVERED,
    tests: [cliApiTest("signs a bundle for every answer the published CLI can send, not only the defaults"), CLI_BUNDLE],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-unknown-key",
    outcome: "A key the site never issued is refused with invalidLicenseKey",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "cli-licence-api.spec.ts", title: "CLI licence API › refuses a key the site never issued" }],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-slot-limit",
    outcome: "The machine after the tier's limit is refused with activationLimitReached and stores no credentials",
    status: FLOW_STATUS.COVERED,
    tests: [
      SLOT_LIMIT,
      publishedCliTest("is refused the machine after the tier's limit with activationLimitReached and stores no credentials"),
    ],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-ci-slots",
    outcome: "A CI machine named by its repository takes one slot for that repository and keeps it on every run",
    status: FLOW_STATUS.COVERED,
    tests: [cliApiTest("keeps one slot for a CI machine named by its repository on every run, and gives another repository its own")],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-refunded-key",
    outcome: "The key of a refunded licence is refused with licenseRefunded, and the CLI removes its credentials",
    status: FLOW_STATUS.COVERED,
    tests: [
      publishedCliTest("loses the key of a refunded licence, refused with licenseRefunded, and removes its credentials"),
      REFUND_STOPS_KEY,
    ],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-revoked-key",
    outcome: "The key of a revoked licence is refused with licenseRevoked",
    status: FLOW_STATUS.COVERED,
    tests: [REVOKED_KEY],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-rate-limit",
    outcome: "Requests over the limit for one address or one key within the period are refused with rateLimited and a Retry-After",
    status: FLOW_STATUS.COVERED,
    tests: [cliApiTest("refuses requests over the limit for one address or one key with rateLimited and a Retry-After")],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-invalid-request",
    outcome: "A malformed request is refused with invalidRequest",
    status: FLOW_STATUS.COVERED,
    tests: [cliApiTest("refuses a malformed request with invalidRequest")],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-polar-unavailable",
    outcome: "When Polar cannot be reached, the API answers serviceUnavailable with a Retry-After",
    status: FLOW_STATUS.COVERED,
    tests: [cliApiTest("answers serviceUnavailable with a Retry-After when Polar cannot be reached")],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-published-commands",
    outcome:
      "The published CLI activates with the key and writes its credentials, whoami shows the machine, and deactivate frees the slot and removes the credentials",
    status: FLOW_STATUS.COVERED,
    tests: [
      publishedCliTest(
        "activates with the key and writes its credentials, whoami shows the machine, and deactivate frees the slot and removes them",
      ),
      CLI_MACHINE,
    ],
  },
  {
    feature: FLOW_FEATURE.CLI_API,
    id: "cli-init-project",
    outcome: "The published CLI's init, with an activated licence, downloads the bundle for the chosen answers and writes the project",
    reason:
      "The published CLI asks for the bundle of its own release and downloads it from the https address the API contract requires, while the browser suite's Worker serves plain http and holds only a fixture bundle; the journey stops at the licence commands.",
    status: FLOW_STATUS.MISSING,
  },
] as const satisfies readonly Flow[]
