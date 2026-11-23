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
      "/admin/orders lists the orders copied from Polar, searched by order, customer or product and filtered by status and product on the server, and opens an order with Polar's live payment, discount, billing country and invoice",
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
    id: "admin-orders-total-days-sort",
    outcome:
      "/admin/orders filters the orders by a range of totals and by the days they were placed, and sorts them by their total, all on the server",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-orders.spec.ts",
        title: "the admin narrows the buyer's orders by total and day and sorts them by total on the server",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-orders-live-filter",
    outcome:
      "/admin/orders highlights the status under the pointer, and each status the admin ticks shows at once as a chip in the toolbar and in the results while the filter stays open",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-orders.spec.ts",
        title: "the admin ticks two statuses and sees each one as a chip and in the results while the filter stays open",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-orders-layout",
    outcome:
      "/admin/orders hides, shows, pins and moves its columns, keeps that layout in the browser after a reload and puts the defaults back on reset",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-orders.spec.ts",
        title: "the admin hides, shows, pins and moves columns, keeps the layout after a reload and resets it",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-orders-export",
    outcome: "/admin/orders downloads every order the search and filters find, across pages, as a CSV of the visible columns",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-orders.spec.ts", title: "the admin exports the orders the search finds to a CSV with the visible columns" }],
  },
  {
    area: FLOW_AREA.ADMIN_PAYMENTS,
    id: "admin-orders-keyboard",
    outcome: "/admin/orders filters the orders, hides a column, resizes one and selects a row with the keyboard alone",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-orders.spec.ts", title: "the admin filters, hides a column, resizes one and selects a row from the keyboard" }],
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
