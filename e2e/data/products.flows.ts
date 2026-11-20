import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const PRODUCTS_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-products-list",
    outcome: "/admin/products lists the products and the categories stored in D1",
    reason: "The workspace specs open the page and scan it; no spec checks a product or a category on it.",
    status: FLOW_STATUS.MISSING,
    tests: [{ spec: "workspaces.spec.ts", title: "admin can sign in and load the permitted workspace" }],
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-create-product",
    outcome: "The admin creates a product, and it appears in the product list",
    reason: "There is no create screen: create-product.ts has no screen.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-edit-product",
    outcome: "The admin edits a product's name, description, price and status",
    reason: "update-product.ts has no screen.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_PRODUCTS,
    id: "admin-delete-product",
    outcome: "The admin deletes a product, and it leaves the product list",
    reason: "delete-product.ts has no screen.",
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
