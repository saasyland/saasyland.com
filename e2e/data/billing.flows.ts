import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

const BILLING_PAGE = {
  spec: "billing.spec.ts",
  title: "billing › a customer sees what they bought, opens an invoice and manages billing in Polar's customer portal",
} as const

const CHECKOUT_CONFIRMED = {
  spec: "billing.spec.ts",
  title: "billing › a buyer back from Polar's checkout sees the payment received until Polar's order arrives, then a thank-you with the order listed",
} as const

const UNCONFIRMED_BILLING = {
  spec: "billing.spec.ts",
  title: "billing › a customer who has not confirmed the address sees the orders and invoices, but not the portal, which refuses them",
} as const

export const BILLING_FLOWS = [
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-any-product",
    outcome:
      "A signed-in customer pays for a Polar product that no feature sells through a checkout of its own, in Polar's checkout over the page, and lands on the billing page",
    reason:
      "No page of the site renders CheckoutButton yet. Its component test covers the button, the order module's startCheckout is covered by its integration test, the licence purchase specs run the same createCheckout and overlay, and billing.spec.ts covers the billing page the button lands on.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    feature: FLOW_FEATURE.PURCHASE,
    id: "checkout-confirmed",
    outcome:
      "A buyer back from Polar's checkout on /app/billing sees the payment received while Polar's order is missing or pending, then a thank-you once the paid order arrives, with the order in the list and no customer session token in the address",
    status: FLOW_STATUS.COVERED,
    tests: [CHECKOUT_CONFIRMED],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "billing-page",
    outcome:
      "A customer opens Billing from the sidebar and sees their subscriptions with price, status and renewal date and their orders with invoice number, total and status, and opens the invoice Polar issued",
    status: FLOW_STATUS.COVERED,
    tests: [BILLING_PAGE],
  },
  {
    feature: FLOW_FEATURE.AFTER_SALE,
    id: "customer-portal",
    outcome:
      "A customer with a confirmed address presses Manage billing and lands in Polar's customer portal with a customer session; an unconfirmed one gets no button and the portal refuses them",
    status: FLOW_STATUS.COVERED,
    tests: [BILLING_PAGE, UNCONFIRMED_BILLING],
  },
  {
    feature: FLOW_FEATURE.ADMIN_PAYMENTS,
    id: "orders-mirrored",
    outcome: "Polar's order webhooks keep one copy of each order in D1, and an older event never overwrites a newer one",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "billing.spec.ts",
        title: "billing › an older order event delivered after a newer one leaves the one copy of the order as the newer event left it",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_PAYMENTS,
    id: "subscriptions-mirrored",
    outcome: "Polar's subscription webhooks keep one copy of each subscription in D1, and an older event never overwrites a newer one",
    reason:
      "billing.spec.ts sends subscription.created and reads the copy on the billing page, but the test Worker's /__test/polar/billing-purchase signs no later subscription event, and e2e/data/billing.worker.ts reads the webhook secret, so changing it needs a person's review.",
    status: FLOW_STATUS.MISSING,
  },
] as const satisfies readonly Flow[]
