import { CATEGORY_KIND, CATEGORY_VISIBILITY } from "../../src/modules/category/category.constants"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "../../src/modules/product/product.constants"

export const TEST_PRODUCTS = [
  {
    billingCycle: "",
    currency: "USD",
    description: "A one-time product priced in dollars",
    id: "test-product-usd",
    name: "Test dollar product",
    price: 49,
    shown: "$49.00",
    status: PRODUCT_STATUS.PUBLISHED,
    type: PRODUCT_TYPE.ONE_TIME,
  },
  {
    billingCycle: "month",
    currency: "JPY",
    description: "A monthly product priced in yen",
    id: "test-product-jpy",
    name: "Test yen product",
    price: 4900,
    shown: "¥4,900 / month",
    status: PRODUCT_STATUS.DRAFT,
    type: PRODUCT_TYPE.SUBSCRIPTION,
  },
] as const

export const TEST_CATEGORY = {
  description: "Products the browser suite seeds",
  id: "test-category",
  kind: CATEGORY_KIND.CATEGORY,
  name: "Test category",
  visibility: CATEGORY_VISIBILITY.PUBLIC,
} as const
