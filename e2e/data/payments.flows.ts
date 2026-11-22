import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const PAYMENTS_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-revenue",
    outcome:
      "The dashboard totals the paid orders of the last 30 days or 12 months per currency, refunds subtracted and pending orders left out",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-dashboard.spec.ts", title: "the dashboard totals the seeded orders per currency, refunds subtracted, and follows the period" }],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-sales-group",
    outcome:
      "The admin menu lists Orders under Sales and only Products under Offerings, on a desktop and in the phone's sidebar, and Orders opens /admin/orders",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-dashboard.spec.ts",
        title: "the admin menu files orders under Sales and keeps only the products under Offerings, on a desktop and a phone",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-orders-list",
    outcome:
      "/admin/orders lists the orders copied from Polar, searched by customer and filtered by status and product on the server, and opens an order with Polar's live payment, discount, billing country and invoice",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-orders.spec.ts",
        title: "the admin finds the buyer's orders by search, status and product, and opens one with Polar's live payment",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-orders-discount-country",
    outcome:
      "/admin/orders shows each order's discount and billing country from the copy, filters by any discount, no discount, one discount and the billing country on the server, and says nothing matches a filter that finds no order",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-orders.spec.ts",
        title: "the admin filters the buyer's orders by discount and billing country, and sees both in the list",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-order-polar-unavailable",
    outcome: "An order page whose order Polar does not answer for shows the saved copy and says Polar could not be reached",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "admin-orders.spec.ts", title: "an order Polar does not answer for shows the saved copy and says Polar could not be reached" },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-customers-list",
    outcome:
      "/admin/users/customers lists every Polar customer with their account, order count and what they paid after refunds per currency, and opens their profile with their orders and licence",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-orders.spec.ts",
        title: "the customers tab lists the buyer with their orders and what they paid after refunds, and opens their profile",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-refund-order",
    outcome: "The admin refunds an order from its page in /admin/orders, and its licence is marked refunded",
    reason: "Refunds are made in Polar's dashboard; the order page links to it but cannot refund yet.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
