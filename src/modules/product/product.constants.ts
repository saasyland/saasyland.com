export const PRODUCT_NAME_MAX_LENGTH = 255

export const BILLING_CYCLE_MAX_LENGTH = 32

export const PRODUCT_STATUS = {
  ARCHIVED: "archived",
  DRAFT: "draft",
  PUBLISHED: "published",
} as const

export const PRODUCT_TYPE = {
  COURSE: "course",
  ONE_TIME: "one_time",
  SUBSCRIPTION: "subscription",
} as const

export const PRODUCT_QUERY_KEYS = {
  ALL: ["product"],
  LIST: ["product", "getProducts"],
} as const

export const PRODUCT_MUTATION_KEYS = {
  CREATE: ["product", "createProduct"],
  DELETE: ["product", "deleteProduct"],
  UPDATE: ["product", "updateProduct"],
} as const
