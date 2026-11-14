import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import {
  type PolarCatalogue,
  polarCheckoutProduct,
  polarCustomer,
  polarDiscount,
  polarDiscountAmount,
  polarLicenseKey,
  polarLicenseKeyGrant,
  polarOrder,
  polarOrderProduct,
  polarPrice,
  polarProductPrice,
} from "~/src/platform/testing/lib/polar"

import { polarCore } from "~/src/integrations/polar/polar.config"
import { POLAR_CHECKOUT_ID_PLACEHOLDER, POLAR_ORDER_STATUS, POLAR_PRODUCT_IDS } from "~/src/integrations/polar/polar.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { PPP_KEYS, PPP_PERCENT } from "~/src/modules/_core/constants/pricing"
import { LICENSE_TIERS, type LicenseTier } from "~/src/modules/license/license.constants"

type RequestSchema<Model> = { readonly [Key in keyof Model]?: zod.ZodType<Model[Key]> }

const BASIS_POINTS_PER_PERCENT = 100
const MAX_PAGE_SIZE = 100
const METADATA_MAX_KEYS = 50
const METADATA_KEY_MAX_LENGTH = 40
const METADATA_VALUE_MAX_LENGTH = 500
const CHECKOUT_LIFETIME_MS = 3_600_000
const LICENSE_KEY_PATH = /^\/v1\/license-keys\/(?<id>[^/]+)$/u
const ORDER_PATH = /^\/v1\/orders\/(?<id>[^/]+)$/u

const CATALOGUE: PolarCatalogue = { organizationId: env.POLAR_ORGANIZATION_ID, productIds: POLAR_PRODUCT_IDS }

export const POLAR_DISCOUNTS = PPP_KEYS.filter((key) => key < PPP_PERCENT).map((key) =>
  polarDiscount(CATALOGUE, (PPP_PERCENT - key) * BASIS_POINTS_PER_PERCENT),
)

const DISCOUNT_PRODUCTS = LICENSE_TIERS.map((tier) => polarOrderProduct(CATALOGUE, tier))

const withProducts = (discount: models.DiscountPercentageOnceForeverDurationBase): models.Discount => ({
  ...discount,
  products: DISCOUNT_PRODUCTS,
})

const DISCOUNTS_WITH_PRODUCTS = POLAR_DISCOUNTS.map((discount) => withProducts(discount))

const checkouts = new Map<string, models.Checkout>()
const orders = new Map<string, models.Order>()
const licenseKeys = new Map<string, models.LicenseKeyWithActivations>()
const customers = new Map<string, models.CustomerIndividual>()

export const resetPolar = (): void => {
  checkouts.clear()
  orders.clear()
  licenseKeys.clear()
  customers.clear()
}

const tierOf = (productId: string | null): LicenseTier | undefined => LICENSE_TIERS.find((tier) => POLAR_PRODUCT_IDS[tier] === productId)

const discountOf = (discountId: string | null): models.DiscountPercentageOnceForeverDurationBase | null =>
  POLAR_DISCOUNTS.find(({ id }) => id === discountId) ?? null

const customerFor = (externalId: string): models.CustomerIndividual => {
  const customer = customers.get(externalId) ?? polarCustomer(CATALOGUE, externalId)
  customers.set(externalId, customer)
  return customer
}

const found = <Value>(value: Value | null | undefined, kind: string, id: string): Value => {
  if (value === undefined || value === null) {
    throw new Error(`The Polar test double has no ${kind} ${id}`)
  }
  return value
}

export const polarCheckouts = (): models.Checkout[] => [...checkouts.values()]

export const polarLicenseKeyOf = (grant: models.BenefitGrantLicenseKeysWebhook): models.LicenseKeyWithActivations => {
  const licenseKeyId = found(grant.properties.license_key_id, "license key of grant", grant.id)
  return found(licenseKeys.get(licenseKeyId), "license key", licenseKeyId)
}

const saveOrder = (order: models.Order): models.Order => {
  orders.set(order.id, order)
  return order
}

export const createPolarOrder = (
  { externalCustomerId, tier }: { readonly externalCustomerId: string; readonly tier: LicenseTier },
  overrides: Partial<models.Order> = {},
): models.Order => {
  const order = polarOrder({
    catalogue: CATALOGUE,
    checkoutId: null,
    customer: customerFor(externalCustomerId),
    discount: null,
    metadata: {},
    status: POLAR_ORDER_STATUS.PAID,
    tier,
  })
  return saveOrder({ ...order, ...overrides })
}

export const payPolarCheckout = (checkoutId: string): models.Order => {
  const checkout = found(checkouts.get(checkoutId), "checkout", checkoutId)
  const externalCustomerId = found(checkout.external_customer_id, "external customer of checkout", checkoutId)
  const tier = found(tierOf(checkout.product_id), "licence product of checkout", checkoutId)
  checkouts.set(checkoutId, { ...checkout, status: "succeeded" })
  const order = polarOrder({
    catalogue: CATALOGUE,
    checkoutId,
    customer: customerFor(externalCustomerId),
    discount: discountOf(checkout.discount_id),
    metadata: checkout.metadata,
    status: POLAR_ORDER_STATUS.PAID,
    tier,
  })
  return saveOrder(order)
}

export const refundPolarOrder = (orderId: string, amount: number): models.Order => {
  const order = found(orders.get(orderId), "order", orderId)
  const refunded = order.refunded_amount + amount
  return saveOrder({
    ...order,
    refundable_amount: order.net_amount - refunded,
    refunded_amount: refunded,
    status: refunded < order.net_amount ? POLAR_ORDER_STATUS.PARTIALLY_REFUNDED : POLAR_ORDER_STATUS.REFUNDED,
  })
}

export const grantPolarLicenseKey = (order: models.Order, activationLimit: number): models.BenefitGrantLicenseKeysWebhook => {
  const customer = customerFor(found(order.customer.external_id, "external customer of order", order.id))
  const licenseKey = polarLicenseKey({ activationLimit, benefitId: crypto.randomUUID(), customer })
  licenseKeys.set(licenseKey.id, licenseKey)
  return polarLicenseKeyGrant({ activationLimit, customer, licenseKey, orderId: order.id })
}

export const revokePolarLicenseKey = (grant: models.BenefitGrantLicenseKeysWebhook): models.BenefitGrantLicenseKeysWebhook => {
  const licenseKey = polarLicenseKeyOf(grant)
  licenseKeys.set(licenseKey.id, { ...licenseKey, status: "revoked" })
  return { ...grant, is_granted: false, is_revoked: true, revoked_at: new Date().toISOString() }
}

export const activatePolarLicenseKey = (grant: models.BenefitGrantLicenseKeysWebhook, label: string): models.LicenseKeyActivationBase => {
  const licenseKey = polarLicenseKeyOf(grant)
  const activation = {
    created_at: new Date().toISOString(),
    id: crypto.randomUUID(),
    label,
    license_key_id: licenseKey.id,
    meta: {},
    modified_at: null,
  }
  licenseKeys.set(licenseKey.id, { ...licenseKey, activations: [...licenseKey.activations, activation] })
  return activation
}

const respond = (status: number, body?: unknown): Response =>
  body === undefined ? new Response(undefined, { status }) : Response.json(body, { status })

const notFound = (): Response =>
  respond(HTTP_STATUS.NOT_FOUND, { detail: "Not found", error: "ResourceNotFound" } satisfies models.ResourceNotFound)

const refuse = (status: number, body: unknown, reason: string) => ({ reason, response: respond(status, body) })

const invalid = (location: string, issues: string) =>
  refuse(
    HTTP_STATUS.UNPROCESSABLE_CONTENT,
    { detail: [{ loc: [location], msg: issues, type: "value_error" }] } satisfies models.HTTPValidationError,
    `${location}: ${issues}`,
  )

const metadataSchema = zod
  .record(zod.string().max(METADATA_KEY_MAX_LENGTH), zod.union([zod.string().max(METADATA_VALUE_MAX_LENGTH), zod.number(), zod.boolean()]))
  .refine((metadata) => Object.keys(metadata).length <= METADATA_MAX_KEYS, `metadata holds at most ${String(METADATA_MAX_KEYS)} keys`)

const checkoutCreateSchema = zod.strictObject({
  allow_discount_codes: zod.boolean(),
  customer_ip_address: zod.union([zod.ipv4(), zod.ipv6()]).optional(),
  discount_id: zod.uuid().optional(),
  external_customer_id: zod.string().min(1),
  metadata: metadataSchema,
  products: zod.tuple([zod.string()]),
  success_url: zod.url(),
} satisfies RequestSchema<models.CheckoutCreate>)

const discountsQuerySchema = zod.strictObject({
  limit: zod.coerce.number().int().min(1).max(MAX_PAGE_SIZE),
  organization_id: zod.literal(env.POLAR_ORGANIZATION_ID),
  page: zod.coerce.number().int().min(1),
  sorting: zod.literal("-created_at" satisfies models.DiscountSortProperty),
})

const licenseKeyDeactivateSchema = zod.strictObject({
  activation_id: zod.uuid(),
  key: zod.string().min(1),
  organization_id: zod.literal(env.POLAR_ORGANIZATION_ID),
} satisfies RequestSchema<models.LicenseKeyDeactivate>)

const checkoutDiscount = (discount: models.DiscountPercentageOnceForeverDurationBase | null): models.Checkout["discount"] => {
  if (discount === null) {
    return null
  }
  const { basis_points: basisPoints, code, duration, id, name, type } = discount
  return { basis_points: basisPoints, code, duration, id, name, type }
}

const createCheckout = async (request: Request) => {
  const body = checkoutCreateSchema.safeParse(await request.json())
  if (!body.success) {
    return invalid("body", zod.prettifyError(body.error))
  }
  const [productId] = body.data.products
  const tier = tierOf(productId)
  if (tier === undefined) {
    return invalid("body.products", `${productId} is not a product of the organization`)
  }
  const discount = discountOf(body.data.discount_id ?? null)
  if (body.data.discount_id !== undefined && discount === null) {
    return invalid("body.discount_id", `${body.data.discount_id} is not a discount of the organization`)
  }
  const id = crypto.randomUUID()
  const createdAt = new Date()
  const product = polarCheckoutProduct(CATALOGUE, tier)
  const price = polarProductPrice(CATALOGUE, tier)
  const amount = polarPrice(tier)
  const discountAmount = polarDiscountAmount(amount, discount)
  const checkout: models.Checkout = {
    active_trial_interval: null,
    active_trial_interval_count: null,
    allow_discount_codes: body.data.allow_discount_codes,
    allow_trial: null,
    amount,
    attached_custom_fields: [],
    billing_address_fields: {
      city: "disabled",
      country: "required",
      line1: "disabled",
      line2: "disabled",
      postal_code: "disabled",
      state: "disabled",
    },
    client_secret: `polar_c_${id.replaceAll("-", "")}`,
    created_at: createdAt.toISOString(),
    currency: price.price_currency,
    customer_billing_address: null,
    customer_billing_name: null,
    customer_email: null,
    customer_id: null,
    customer_ip_address: body.data.customer_ip_address ?? null,
    customer_metadata: {},
    customer_name: null,
    customer_tax_id: null,
    discount: checkoutDiscount(discount),
    discount_amount: discountAmount,
    discount_id: discount?.id ?? null,
    embed_origin: null,
    expires_at: new Date(createdAt.getTime() + CHECKOUT_LIFETIME_MS).toISOString(),
    external_customer_id: body.data.external_customer_id,
    id,
    is_business_customer: false,
    is_discount_applicable: true,
    is_free_product_price: false,
    is_payment_form_required: true,
    is_payment_required: true,
    is_payment_setup_required: false,
    max_units: null,
    metadata: body.data.metadata,
    min_units: null,
    modified_at: null,
    net_amount: amount - discountAmount,
    organization_id: CATALOGUE.organizationId,
    payment_method_type: null,
    payment_processor: "stripe",
    payment_processor_metadata: {},
    prices: { [product.id]: product.prices },
    product,
    product_id: product.id,
    product_price: price,
    product_price_id: price.id,
    products: [product],
    require_billing_address: false,
    return_url: null,
    status: "open",
    subscription_id: null,
    success_url: body.data.success_url,
    tax_amount: null,
    tax_behavior: null,
    total_amount: amount - discountAmount,
    trial_end: null,
    trial_interval: null,
    trial_interval_count: null,
    units: null,
    url: body.data.success_url.replaceAll(POLAR_CHECKOUT_ID_PLACEHOLDER, id),
  }
  checkouts.set(id, checkout)
  return respond(HTTP_STATUS.CREATED, checkout)
}

const listDiscounts = (url: URL) => {
  const query = discountsQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!query.success) {
    return invalid("query", zod.prettifyError(query.error))
  }
  const { limit, page } = query.data
  return respond(HTTP_STATUS.OK, {
    items: DISCOUNTS_WITH_PRODUCTS.slice((page - 1) * limit, page * limit),
    pagination: { max_page: Math.max(1, Math.ceil(DISCOUNTS_WITH_PRODUCTS.length / limit)), total_count: DISCOUNTS_WITH_PRODUCTS.length },
  } satisfies models.ListResourceDiscount)
}

const deactivateLicenseKey = async (request: Request) => {
  const body = licenseKeyDeactivateSchema.safeParse(await request.json())
  if (!body.success) {
    return invalid("body", zod.prettifyError(body.error))
  }
  const licenseKey = [...licenseKeys.values()].find(({ key }) => key === body.data.key)
  if (licenseKey?.activations.some(({ id }) => id === body.data.activation_id) !== true) {
    return notFound()
  }
  licenseKeys.set(licenseKey.id, { ...licenseKey, activations: licenseKey.activations.filter(({ id }) => id !== body.data.activation_id) })
  return respond(HTTP_STATUS.NO_CONTENT)
}

const read = (value: models.LicenseKeyWithActivations | models.Order | undefined): Response =>
  value === undefined ? notFound() : respond(HTTP_STATUS.OK, value)

const route = (request: Request) => {
  const url = new URL(request.url)
  const endpoint = `${request.method} ${url.pathname}`
  if (endpoint === "POST /v1/checkouts/") {
    return createCheckout(request)
  }
  if (endpoint === "GET /v1/discounts/") {
    return listDiscounts(url)
  }
  if (endpoint === "POST /v1/license-keys/deactivate") {
    return deactivateLicenseKey(request)
  }
  const licenseKeyId = request.method === "GET" ? LICENSE_KEY_PATH.exec(url.pathname)?.groups?.["id"] : undefined
  if (licenseKeyId !== undefined) {
    return read(licenseKeys.get(licenseKeyId))
  }
  const orderId = request.method === "GET" ? ORDER_PATH.exec(url.pathname)?.groups?.["id"] : undefined
  if (orderId !== undefined) {
    return read(orders.get(orderId))
  }
  return refuse(HTTP_STATUS.NOT_FOUND, { detail: "Not Found" }, `the test double does not serve ${endpoint}`)
}

export const polarApi = {
  origin: new URL(polarCore.buildRequest("GET", "/")[0]).origin,
  respond: async (request: Request) => {
    if (request.headers.get("Authorization") !== `Bearer ${env.POLAR_ACCESS_TOKEN}`) {
      return refuse(
        HTTP_STATUS.UNAUTHORIZED,
        { detail: "Missing or invalid access token", error: "Unauthorized" } satisfies models.Unauthorized,
        "the request does not carry POLAR_ACCESS_TOKEN",
      )
    }
    return route(request)
  },
}
