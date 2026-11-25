import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const PRODUCTS_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-products-list",
    outcome:
      "/admin/products lists every product of the Polar organisation with its prices, its licence key's activation limit, its status and a link to it in Polar, and beside each the paid orders and what buyers paid after refunds per currency, from the copies of the orders in D1",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-products.spec.ts",
        title:
          "the product list shows the Polar catalogue with each product's prices, licence key and status, and its sales and what buyers paid from the copies of the orders",
      },
      { spec: "workspaces.spec.ts", title: "admin can sign in and load the permitted workspace" },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-products-grid",
    outcome:
      "/admin/products searches the Polar products by name, filters them by status, sorts them by sales both ways, and keeps the column the admin hid after a reload until the layout is reset",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-products.spec.ts",
        title:
          "the admin searches the products, filters them by status, sorts them by sales both ways, hides a column and keeps the layout after a reload",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-create-product",
    outcome: "The admin creates a product in Polar from the admin, and it appears in the product list",
    reason: "Products are created in the Polar dashboard; no screen creates one through Polar yet.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-edit-product",
    outcome: "The admin edits a product's name, description, price and status in Polar from the admin",
    reason: "Products are edited in the Polar dashboard, which each row links to; no screen edits one through Polar yet.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-delete-product",
    outcome: "The admin deletes a product in Polar from the admin, and it leaves the product list",
    reason: "Products are deleted or archived in the Polar dashboard; no screen does either through Polar yet.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-categories",
    outcome: "The admin creates, renames and deletes product categories",
    reason: "The category server functions have no screen.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-change-price",
    outcome: "The admin changes a tier's price, and the landing page, the licence offer and the checkout charge the new price",
    reason: "Prices are declared in TIER_PRICES and on the Polar products; no screen changes them.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-pricing-models",
    outcome: "The admin sets up one-time and recurring pricing models for a product",
    reason: "There is no pricing screen; prices are declared in TIER_PRICES and on the Polar products.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-discounts",
    outcome: "The admin creates a discount code, and a checkout with the code charges the discounted price",
    reason: "There is no discount screen; the regional discounts are set in Polar and checked by polar:verify.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
