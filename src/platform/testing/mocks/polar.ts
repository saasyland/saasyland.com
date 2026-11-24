import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import * as zod from "zod"

import {
  type PolarCatalogue,
  type PolarLicenseKeyBenefit,
  type PolarProduct,
  polarCheckoutProduct,
  polarCustomer,
  polarLicenseKey,
  polarLicenseKeyGrant,
  polarOrder,
  polarProductPrice,
} from "~/src/platform/testing/lib/polar"
import * as AREA_POLAR_CATALOGUES from "~/src/platform/testing/mocks/polar-catalogue.entries"
import type { ProviderDouble } from "~/src/platform/testing/mocks/providers"

import { polarCore } from "~/src/integrations/polar/polar.config"
import {
  POLAR_CHECKOUT_ID_PLACEHOLDER,
  POLAR_LICENSE_KEY_STATUS,
  POLAR_MINIMUM_PRICE_AMOUNT,
  POLAR_ORDER_STATUS,
  polarCheckoutOrigin,
} from "~/src/integrations/polar/polar.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

type RequestSchema<Model> = { readonly [Key in keyof Model]?: zod.ZodType<Model[Key]> }

const MAX_PAGE_SIZE = 100
const METADATA_MAX_KEYS = 50
const METADATA_KEY_MAX_LENGTH = 40
const METADATA_VALUE_MAX_LENGTH = 500
const CHECKOUT_LIFETIME_MS = 3_600_000
const AD_HOC_CURRENCY = "usd" satisfies models.PresentmentCurrency

export const POLAR_API = {
  CHECKOUTS: "/v1/checkouts/",
  LICENSE_KEY: "/v1/license-keys/:id",
  LICENSE_KEY_ACTIVATION: "/v1/license-keys/activate",
  LICENSE_KEY_DEACTIVATION: "/v1/license-keys/deactivate",
  ORDER: "/v1/orders/:id",
  ORDERS: "/v1/orders/",
  ORDER_INVOICE: "/v1/orders/:id/invoice",
  PRODUCTS: "/v1/products/",
} as const

const AREAS: Readonly<Record<string, PolarCatalogue>> = AREA_POLAR_CATALOGUES

const products = new Map<string, PolarProduct>()
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
  for (const benefit of catalogue.licenseKeyBenefits) {
    for (const { id } of benefit.products) {
      licenseKeyBenefits.set(id, benefit)
    }
  }
}

const resetPolar = (): void => {
  products.clear()
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

export const payPolarCheckout = (checkoutId: string, customFieldData: models.Order["custom_field_data"] = {}): models.Order => {
  const checkout = found(checkouts.get(checkoutId), "checkout", checkoutId)
  const externalCustomerId = found(checkout.external_customer_id, "external customer of checkout", checkoutId)
  const catalogueProduct = productOf(found(checkout.product_id, "product of checkout", checkoutId))
  const product = { ...catalogueProduct, price: { ...catalogueProduct.price, amount: checkout.amount } }
  const unticked = (catalogueProduct.requiredCheckboxes ?? []).filter((slug) => customFieldData[slug] !== true)
  if (unticked.length > 0) {
    throw new Error(`Polar refuses to confirm checkout ${checkoutId}: the buyer must tick ${unticked.join(", ")}`)
  }
  checkouts.set(checkoutId, { ...checkout, status: "succeeded" })
  const order = polarOrder({
    checkoutId,
    customer: customerFor(externalCustomerId),
    metadata: checkout.metadata,
    product,
    status: POLAR_ORDER_STATUS.PAID,
  })
  return saveOrder({ ...order, custom_field_data: customFieldData })
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
  activations,
  externalCustomerId,
  key,
  licenseKeyId,
  productId,
}: {
  readonly activations: readonly {
    readonly createdAt: string
    readonly id: string
    readonly label: string
    readonly meta?: models.LicenseKeyActivationBase["meta"]
  }[]
  readonly externalCustomerId: string
  readonly key: string
  readonly licenseKeyId: string
  readonly productId: string
}): void => {
  const licenseKey = polarLicenseKey({
    activations: activations.map(({ createdAt, id, label, meta = {} }) => ({
      created_at: createdAt,
      id,
      label,
      license_key_id: licenseKeyId,
      meta,
      modified_at: null,
    })),
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

type Reply = ReturnType<typeof refuse> | Response

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

const adHocPriceSchema = zod.strictObject({
  amount_type: zod.literal("fixed"),
  price_amount: zod.int().refine((amount) => amount === 0 || amount >= POLAR_MINIMUM_PRICE_AMOUNT, "below the minimum price"),
  price_currency: zod.literal(AD_HOC_CURRENCY),
})

const checkoutCreateSchema = zod
  .strictObject({
    allow_discount_codes: zod.boolean(),
    custom_field_data: customFieldDataSchema.optional(),
    customer_email: zod.email(),
    customer_ip_address: zod.union([zod.ipv4(), zod.ipv6()]).nullable(),
    customer_name: zod.string(),
    embed_origin: zod
      .url()
      .refine((origin) => new URL(origin).origin === origin, "an origin, without a path")
      .optional(),
    external_customer_id: zod.string().min(1),
    locale: zod.string().min(1).optional(),
    metadata: metadataSchema,
    prices: zod.record(zod.string(), zod.tuple([adHocPriceSchema])).optional(),
    products: zod.tuple([zod.string()]),
    return_url: zod.url().optional(),
    success_url: zod.url(),
  } satisfies RequestSchema<models.CheckoutCreate>)
  .refine(({ prices = {}, products: [productId] }) => Object.keys(prices).every((pricedProductId) => pricedProductId === productId), {
    message: "Product is not set on that checkout.",
    path: ["prices"],
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

const licenseKeyUpdateSchema = zod.strictObject({
  limit_activations: zod.int().positive().optional(),
  status: zod.enum(POLAR_LICENSE_KEY_STATUS).optional(),
} satisfies RequestSchema<models.LicenseKeyUpdate>)

const ordersQuerySchema = zod.strictObject({
  customer_id: zod.string().min(1),
  limit: zod.coerce.number().int().min(1).max(MAX_PAGE_SIZE),
  organization_id: zod.literal(env.POLAR_ORGANIZATION_ID),
  page: zod.coerce.number().int().min(1),
  product_id: zod.array(zod.string().min(1)).min(1),
  sorting: zod.literal("-created_at" satisfies models.OrderSortProperty),
})

const licenseKeyDeactivateSchema = zod.strictObject({
  activation_id: zod.uuid(),
  key: zod.string().min(1),
  organization_id: zod.literal(env.POLAR_ORGANIZATION_ID),
} satisfies RequestSchema<models.LicenseKeyDeactivate>)

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
  const id = crypto.randomUUID()
  const clientSecret = `polar_c_${id.replaceAll("-", "")}`
  const createdAt = new Date()
  const product = polarCheckoutProduct(env.POLAR_ORGANIZATION_ID, catalogueProduct)
  const price = polarProductPrice(catalogueProduct)
  const amount = body.data.prices?.[productId]?.[0].price_amount ?? catalogueProduct.price.amount
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
    client_secret: clientSecret,
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
    discount: null,
    discount_amount: 0,
    discount_id: null,
    embed_origin: body.data.embed_origin ?? null,
    expires_at: new Date(createdAt.getTime() + CHECKOUT_LIFETIME_MS).toISOString(),
    external_customer_id: body.data.external_customer_id,
    id,
    is_business_customer: false,
    is_discount_applicable: true,
    is_free_product_price: false,
    is_payment_form_required: true,
    is_payment_required: true,
    is_payment_setup_required: false,
    locale: body.data.locale ?? null,
    max_units: null,
    metadata: body.data.metadata,
    min_units: null,
    modified_at: null,
    net_amount: amount,
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
    return_url: body.data.return_url ?? null,
    status: "open",
    subscription_id: null,
    success_url: body.data.success_url.replaceAll(POLAR_CHECKOUT_ID_PLACEHOLDER, id),
    tax_amount: null,
    tax_behavior: null,
    total_amount: amount,
    trial_end: null,
    trial_interval: null,
    trial_interval_count: null,
    units: null,
    url: `${polarCheckoutOrigin(env.POLAR_SERVER)}/checkout/${clientSecret}`,
  }
  checkouts.set(id, checkout)
  return respond(HTTP_STATUS.CREATED, checkout)
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

const updateLicenseKey = async (request: Request, match: URLPatternResult) => {
  const licenseKeyId = resourceId(match)
  const body = licenseKeyUpdateSchema.safeParse(await request.json())
  if (!body.success) {
    return invalid("body", zod.prettifyError(body.error))
  }
  const licenseKey = licenseKeys.get(licenseKeyId)
  if (licenseKey === undefined) {
    return notFound()
  }
  const updated = {
    ...licenseKey,
    ...(body.data.limit_activations === undefined ? {} : { limit_activations: body.data.limit_activations }),
    ...(body.data.status === undefined ? {} : { status: body.data.status }),
  }
  licenseKeys.set(licenseKeyId, updated)
  const { activations: _activations, ...read } = updated
  return respond(HTTP_STATUS.OK, read satisfies models.LicenseKeyRead)
}

const listOrders = (request: Request) => {
  const { searchParams } = new URL(request.url)
  const query = ordersQuerySchema.safeParse({ ...Object.fromEntries(searchParams), product_id: searchParams.getAll("product_id") })
  if (!query.success) {
    return invalid("query", zod.prettifyError(query.error))
  }
  const { customer_id: customerId, limit, page, product_id: productIds } = query.data
  const items = [...orders.values()].filter(
    (order) => order.customer_id === customerId && order.product_id !== null && productIds.includes(order.product_id),
  )
  return respond(HTTP_STATUS.OK, {
    items: items.slice((page - 1) * limit, page * limit),
    pagination: { max_page: Math.max(1, Math.ceil(items.length / limit)), total_count: items.length },
  } satisfies models.ListResourceOrder)
}

export const polarInvoiceUrl = (orderId: string): string => `${polarCheckoutOrigin(env.POLAR_SERVER)}/invoices/${orderId}.pdf`

const readInvoice = (_request: Request, match: URLPatternResult): Response => {
  const orderId = resourceId(match)
  const order = orders.get(orderId)
  if (order?.is_invoice_generated !== true) {
    return notFound()
  }
  return respond(HTTP_STATUS.OK, { url: polarInvoiceUrl(orderId) } satisfies models.OrderInvoice)
}

const readLicenseKey = (_request: Request, match: URLPatternResult): Response => {
  const licenseKey = licenseKeys.get(resourceId(match))
  if (licenseKey === undefined) {
    return notFound()
  }
  return respond(HTTP_STATUS.OK, licenseKey)
}

const readOrder = (_request: Request, match: URLPatternResult): Response => {
  const order = orders.get(resourceId(match))
  if (order === undefined) {
    return notFound()
  }
  return respond(HTTP_STATUS.OK, { ...order, customer: customerOf(order) })
}

interface Endpoint {
  method: string
  pattern: URLPattern
  respond: (request: Request, match: URLPatternResult) => Promise<Reply> | Reply
}

const resourceSchema = zod.object({ id: zod.string() })

const resourceId = (match: URLPatternResult): string => resourceSchema.parse(match.pathname.groups).id

const ENDPOINTS: readonly Endpoint[] = [
  { method: "GET", pattern: new URLPattern({ pathname: POLAR_API.ORDERS }), respond: listOrders },
  { method: "POST", pattern: new URLPattern({ pathname: POLAR_API.CHECKOUTS }), respond: createCheckout },
  { method: "POST", pattern: new URLPattern({ pathname: POLAR_API.LICENSE_KEY_ACTIVATION }), respond: activateLicenseKey },
  { method: "POST", pattern: new URLPattern({ pathname: POLAR_API.LICENSE_KEY_DEACTIVATION }), respond: deactivateLicenseKey },
  { method: "GET", pattern: new URLPattern({ pathname: POLAR_API.LICENSE_KEY }), respond: readLicenseKey },
  { method: "PATCH", pattern: new URLPattern({ pathname: POLAR_API.LICENSE_KEY }), respond: updateLicenseKey },
  { method: "GET", pattern: new URLPattern({ pathname: POLAR_API.ORDER }), respond: readOrder },
  { method: "GET", pattern: new URLPattern({ pathname: POLAR_API.ORDER_INVOICE }), respond: readInvoice },
]

const route = (request: Request) => {
  for (const endpoint of ENDPOINTS) {
    const match = endpoint.pattern.exec(request.url)
    if (endpoint.method === request.method && match !== null) {
      return endpoint.respond(request, match)
    }
  }
  const { pathname } = new URL(request.url)
  return refuse(HTTP_STATUS.NOT_FOUND, { detail: "Not Found" }, `the test double does not serve ${request.method} ${pathname}`)
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
