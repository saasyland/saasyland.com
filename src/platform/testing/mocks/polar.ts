import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import {
  type PolarCatalogue,
  type PolarDiscount,
  type PolarLicenseKeyBenefit,
  type PolarProduct,
  polarCheckoutProduct,
  polarCustomer,
  polarDiscount,
  polarDiscountAmount,
  polarLicenseKey,
  polarLicenseKeyGrant,
  polarOrder,
  polarOrderProduct,
  polarProductPrice,
} from "~/src/platform/testing/lib/polar"
import * as AREA_POLAR_CATALOGUES from "~/src/platform/testing/mocks/polar-catalogue.entries"
import type { ProviderDouble } from "~/src/platform/testing/mocks/providers"

import { polarCore } from "~/src/integrations/polar/polar.config"
import { POLAR_CHECKOUT_ID_PLACEHOLDER, POLAR_LICENSE_KEY_STATUS, POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

type RequestSchema<Model> = { readonly [Key in keyof Model]?: zod.ZodType<Model[Key]> }

const MAX_PAGE_SIZE = 100
const METADATA_MAX_KEYS = 50
const METADATA_KEY_MAX_LENGTH = 40
const METADATA_VALUE_MAX_LENGTH = 500
const CHECKOUT_LIFETIME_MS = 3_600_000
const LICENSE_KEY_PATH = /^\/v1\/license-keys\/(?<id>[^/]+)$/u
const ORDER_PATH = /^\/v1\/orders\/(?<id>[^/]+)$/u

const AREAS: Readonly<Record<string, PolarCatalogue>> = AREA_POLAR_CATALOGUES

const products = new Map<string, PolarProduct>()
const discounts = new Map<string, PolarDiscount>()
const licenseKeyBenefits = new Map<string, PolarLicenseKeyBenefit>()
const checkouts = new Map<string, models.Checkout>()
const orders = new Map<string, models.Order>()
const licenseKeys = new Map<string, models.LicenseKeyWithActivations>()
const activationConditions = new Map<string, models.LicenseKeyActivate["conditions"]>()
const customers = new Map<string, models.CustomerIndividual>()

export const seedPolarCatalogue = (catalogue: PolarCatalogue): void => {
  for (const product of catalogue.products) {
    products.set(product.id, product)
  }
  for (const discount of catalogue.discounts) {
    discounts.set(discount.id, discount)
  }
  for (const benefit of catalogue.licenseKeyBenefits) {
    for (const { id } of benefit.products) {
      licenseKeyBenefits.set(id, benefit)
    }
  }
}

const resetPolar = (): void => {
  products.clear()
  discounts.clear()
  licenseKeyBenefits.clear()
  checkouts.clear()
  orders.clear()
  licenseKeys.clear()
  activationConditions.clear()
  customers.clear()
  for (const catalogue of Object.values(AREAS)) {
    seedPolarCatalogue(catalogue)
  }
}

const found = <Value>(value: Value | null | undefined, kind: string, id: string): Value => {
  if (value === undefined || value === null) {
    throw new Error(`The Polar test double has no ${kind} ${id}`)
  }
  return value
}

const productOf = (productId: string): PolarProduct => found(products.get(productId), "product", productId)

const discountOf = (discountId: string | null): models.DiscountPercentageOnceForeverDurationBase | null => {
  const discount = [...discounts.values()].find(({ id }) => id === discountId)
  return discount === undefined ? null : polarDiscount(env.POLAR_ORGANIZATION_ID, discount)
}

const saveCustomer = (customer: models.CustomerIndividual): models.CustomerIndividual => {
  customers.set(customer.id, customer)
  return customer
}

const customerFor = (externalId: string): models.CustomerIndividual =>
  [...customers.values()].find(({ external_id: id }) => id === externalId) ??
  saveCustomer(polarCustomer(env.POLAR_ORGANIZATION_ID, externalId))

const customerOf = (order: models.Order): models.CustomerIndividual =>
  found(customers.get(order.customer_id), "customer of order", order.id)

export const polarCheckouts = (): models.Checkout[] => [...checkouts.values()]

export const polarLicenseKeyOf = (grant: models.BenefitGrantLicenseKeysWebhook): models.LicenseKeyWithActivations => {
  const licenseKeyId = found(grant.properties.license_key_id, "license key of grant", grant.id)
  return found(licenseKeys.get(licenseKeyId), "license key", licenseKeyId)
}

export const polarActivationConditions = (activationId: string): models.LicenseKeyActivate["conditions"] =>
  activationConditions.get(activationId)

const saveOrder = (order: models.Order): models.Order => {
  orders.set(order.id, order)
  return order
}

export const createPolarOrder = (
  { externalCustomerId, productId }: { readonly externalCustomerId: string; readonly productId: string },
  overrides: Partial<models.Order> = {},
): models.Order => {
  const order = polarOrder({
    checkoutId: null,
    customer: customerFor(externalCustomerId),
    discount: null,
    metadata: {},
    product: productOf(productId),
    status: POLAR_ORDER_STATUS.PAID,
  })
  return saveOrder({ ...order, ...overrides })
}

export const createGuestPolarOrder = ({
  email,
  name,
  productId,
}: {
  readonly email: string
  readonly name: string
  readonly productId: string
}): models.Order => {
  const customer = saveCustomer({ ...polarCustomer(env.POLAR_ORGANIZATION_ID, email), email, external_id: null, name })
  return saveOrder(
    polarOrder({
      checkoutId: null,
      customer,
      discount: null,
      metadata: {},
      product: productOf(productId),
      status: POLAR_ORDER_STATUS.PAID,
    }),
  )
}

export const setPolarCustomerExternalId = (customerId: string, externalId: string): void => {
  const customer = found(customers.get(customerId), "customer", customerId)
  if (typeof customer.external_id === "string") {
    throw new TypeError(`Polar keeps the external ID of customer ${customerId} once it is set`)
  }
  if ([...customers.values()].some(({ external_id: id }) => id === externalId)) {
    throw new Error(`Another customer already has the external ID ${externalId}`)
  }
  saveCustomer({ ...customer, external_id: externalId })
}

export const payPolarCheckout = (checkoutId: string): models.Order => {
  const checkout = found(checkouts.get(checkoutId), "checkout", checkoutId)
  const externalCustomerId = found(checkout.external_customer_id, "external customer of checkout", checkoutId)
  const product = productOf(found(checkout.product_id, "product of checkout", checkoutId))
  checkouts.set(checkoutId, { ...checkout, status: "succeeded" })
  const order = polarOrder({
    checkoutId,
    customer: customerFor(externalCustomerId),
    discount: discountOf(checkout.discount_id),
    metadata: checkout.metadata,
    product,
    status: POLAR_ORDER_STATUS.PAID,
  })
  return saveOrder({ ...order, custom_field_data: checkout.custom_field_data ?? {} })
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

const licenseKeyBenefitOf = (productId: string): PolarLicenseKeyBenefit =>
  found(licenseKeyBenefits.get(productId), "licence-key benefit of product", productId)

export const grantPolarLicenseKey = (
  order: models.Order,
  productId: string = found(order.product_id, "product of order", order.id),
): models.BenefitGrantLicenseKeysWebhook => {
  const benefit = licenseKeyBenefitOf(productId)
  const customer = customerOf(order)
  const licenseKey = polarLicenseKey({ benefit, customer })
  licenseKeys.set(licenseKey.id, licenseKey)
  return polarLicenseKeyGrant({ benefit, customer, licenseKey, orderId: order.id })
}

export const seedPolarLicenseKey = ({
  activation,
  externalCustomerId,
  key,
  licenseKeyId,
  productId,
}: {
  readonly activation: { readonly createdAt: string; readonly id: string; readonly label: string }
  readonly externalCustomerId: string
  readonly key: string
  readonly licenseKeyId: string
  readonly productId: string
}): void => {
  const activations = [
    {
      created_at: activation.createdAt,
      id: activation.id,
      label: activation.label,
      license_key_id: licenseKeyId,
      meta: {},
      modified_at: null,
    },
  ]
  const licenseKey = polarLicenseKey({
    activations,
    benefit: licenseKeyBenefitOf(productId),
    customer: customerFor(externalCustomerId),
    id: licenseKeyId,
    key,
  })
  licenseKeys.set(licenseKeyId, licenseKey)
}

export const revokePolarLicenseKey = (grant: models.BenefitGrantLicenseKeysWebhook): models.BenefitGrantLicenseKeysWebhook => {
  const licenseKey = polarLicenseKeyOf(grant)
  licenseKeys.set(licenseKey.id, { ...licenseKey, status: POLAR_LICENSE_KEY_STATUS.REVOKED })
  return { ...grant, is_granted: false, is_revoked: true, revoked_at: new Date().toISOString() }
}

const addActivation = (
  licenseKey: models.LicenseKeyWithActivations,
  { label, meta }: Pick<models.LicenseKeyActivationBase, "label" | "meta">,
): models.LicenseKeyActivationBase => {
  const activation = {
    created_at: new Date().toISOString(),
    id: crypto.randomUUID(),
    label,
    license_key_id: licenseKey.id,
    meta,
    modified_at: null,
  }
  licenseKeys.set(licenseKey.id, { ...licenseKey, activations: [...licenseKey.activations, activation] })
  return activation
}

export const activatePolarLicenseKey = (
  grant: models.BenefitGrantLicenseKeysWebhook,
  label: string,
  meta: models.LicenseKeyActivationBase["meta"] = {},
): models.LicenseKeyActivationBase => addActivation(polarLicenseKeyOf(grant), { label, meta })

const respond = (status: number, body?: unknown): Response =>
  body === undefined ? new Response(undefined, { status }) : Response.json(body, { status })

const notFound = (): Response =>
  respond(HTTP_STATUS.NOT_FOUND, { detail: "Not found", error: "ResourceNotFound" } satisfies models.ResourceNotFound)

const notPermitted = (detail: string): Response =>
  respond(HTTP_STATUS.FORBIDDEN, { detail, error: "NotPermitted" } satisfies models.NotPermitted)

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

const customFieldDataSchema = zod.record(zod.string(), zod.union([zod.string(), zod.number(), zod.boolean(), zod.null()]))

const checkoutCreateSchema = zod.strictObject({
  allow_discount_codes: zod.boolean(),
  custom_field_data: customFieldDataSchema.optional(),
  customer_email: zod.email(),
  customer_ip_address: zod.union([zod.ipv4(), zod.ipv6()]).nullable(),
  customer_name: zod.string(),
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

const activationDataSchema = zod
  .record(
    zod.string().min(1).max(METADATA_KEY_MAX_LENGTH),
    zod.union([zod.string().min(1).max(METADATA_VALUE_MAX_LENGTH), zod.number(), zod.boolean()]),
  )
  .refine((data) => Object.keys(data).length <= METADATA_MAX_KEYS, `it holds at most ${String(METADATA_MAX_KEYS)} keys`)

const licenseKeyActivateSchema = zod.strictObject({
  conditions: activationDataSchema.optional(),
  key: zod.string().min(1),
  label: zod.string(),
  meta: activationDataSchema.optional(),
  organization_id: zod.literal(env.POLAR_ORGANIZATION_ID),
} satisfies RequestSchema<models.LicenseKeyActivate>)

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
  const catalogueProduct = products.get(productId)
  if (catalogueProduct === undefined) {
    return invalid("body.products", `${productId} is not a product of the organization`)
  }
  const discount = discountOf(body.data.discount_id ?? null)
  if (body.data.discount_id !== undefined && discount === null) {
    return invalid("body.discount_id", `${body.data.discount_id} is not a discount of the organization`)
  }
  const id = crypto.randomUUID()
  const createdAt = new Date()
  const product = polarCheckoutProduct(env.POLAR_ORGANIZATION_ID, catalogueProduct)
  const price = polarProductPrice(catalogueProduct)
  const { amount } = catalogueProduct.price
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
    custom_field_data: body.data.custom_field_data ?? {},
    customer_billing_address: null,
    customer_billing_name: null,
    customer_email: body.data.customer_email,
    customer_id: null,
    customer_ip_address: body.data.customer_ip_address,
    customer_metadata: {},
    customer_name: body.data.customer_name,
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
    organization_id: env.POLAR_ORGANIZATION_ID,
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

const listedDiscount = (discount: PolarDiscount): models.Discount => ({
  ...polarDiscount(env.POLAR_ORGANIZATION_ID, discount),
  products: discount.products.map((product) => polarOrderProduct(env.POLAR_ORGANIZATION_ID, product)),
})

const listDiscounts = (url: URL) => {
  const query = discountsQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!query.success) {
    return invalid("query", zod.prettifyError(query.error))
  }
  const { limit, page } = query.data
  const items = [...discounts.values()].map((discount) => listedDiscount(discount))
  return respond(HTTP_STATUS.OK, {
    items: items.slice((page - 1) * limit, page * limit),
    pagination: { max_page: Math.max(1, Math.ceil(items.length / limit)), total_count: items.length },
  } satisfies models.ListResourceDiscount)
}

const activateLicenseKey = async (request: Request) => {
  const body = licenseKeyActivateSchema.safeParse(await request.json())
  if (!body.success) {
    return invalid("body", zod.prettifyError(body.error))
  }
  const licenseKey = [...licenseKeys.values()].find(({ key }) => key === body.data.key)
  if (licenseKey === undefined) {
    return notFound()
  }
  const { activations, ...granted } = licenseKey
  if (granted.status !== POLAR_LICENSE_KEY_STATUS.GRANTED) {
    return notPermitted("License key is no longer active.")
  }
  if (granted.limit_activations !== null && activations.length >= granted.limit_activations) {
    return notPermitted("License key activation limit already reached")
  }
  const activation = addActivation(licenseKey, { label: body.data.label, meta: body.data.meta ?? {} })
  activationConditions.set(activation.id, body.data.conditions)
  return respond(HTTP_STATUS.OK, {
    ...activation,
    license_key: { ...granted, status: POLAR_LICENSE_KEY_STATUS.GRANTED },
  } satisfies models.LicenseKeyActivationCreated)
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

const currentOrder = (orderId: string): models.Order | undefined => {
  const order = orders.get(orderId)
  return order === undefined ? undefined : { ...order, customer: customerOf(order) }
}

const route = (request: Request) => {
  const url = new URL(request.url)
  const endpoint = `${request.method} ${url.pathname}`
  if (endpoint === "POST /v1/checkouts/") {
    return createCheckout(request)
  }
  if (endpoint === "GET /v1/discounts/") {
    return listDiscounts(url)
  }
  if (endpoint === "POST /v1/license-keys/activate") {
    return activateLicenseKey(request)
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
    return read(currentOrder(orderId))
  }
  return refuse(HTTP_STATUS.NOT_FOUND, { detail: "Not Found" }, `the test double does not serve ${endpoint}`)
}

export const polarApi = {
  origin: new URL(polarCore.buildRequest("GET", "/")[0]).origin,
  reset: resetPolar,
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

export const POLAR_PROVIDER_DOUBLES = [polarApi] as const satisfies readonly ProviderDouble[]
