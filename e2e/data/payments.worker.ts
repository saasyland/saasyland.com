import { MILLISECONDS_PER_DAY } from "../../src/lib/duration"
import { TEST_BUYER_ORDERS, TEST_ORDER_BILLING, TEST_ORDER_BUYER, TEST_ORDER_DISCOUNT, TEST_ORDER_PRODUCTS } from "./payments"
import { TEST_WORKER_KIND, type TestWorkerEntry } from "./worker"

export const PAYMENTS_TEST_WORKER = [
  {
    kind: TEST_WORKER_KIND.SETUP,
    setup: async () => {
      const { env } = await import("cloudflare:workers")
      const polar = await import("../../src/platform/testing/mocks/polar")
      const { polarOrderDiscount } = await import("../../src/platform/testing/lib/polar")
      polar.seedPolarCatalogue({ licenseKeyBenefits: [], products: Object.values(TEST_ORDER_PRODUCTS) })
      const now = Date.now()
      const discount = polarOrderDiscount({ ...TEST_ORDER_DISCOUNT, organizationId: env.POLAR_ORGANIZATION_ID })
      for (const { country, currency, daysAgo, discountAmount, discounted, id, product, refundedAmount, status, totalAmount } of TEST_BUYER_ORDERS) {
        polar.createPolarOrder(
          { externalCustomerId: TEST_ORDER_BUYER.id, productId: product.id },
          {
            billing_address: { country },
            billing_name: TEST_ORDER_BILLING.name,
            created_at: new Date(now - daysAgo * MILLISECONDS_PER_DAY).toISOString(),
            currency,
            ...(discounted ? { discount, discount_id: discount.id } : {}),
            discount_amount: discountAmount,
            id,
            is_invoice_generated: discounted,
            net_amount: totalAmount,
            refunded_amount: refundedAmount,
            status,
            subtotal_amount: totalAmount + discountAmount,
            total_amount: totalAmount,
          },
        )
      }
    },
  },
] as const satisfies readonly TestWorkerEntry[]
