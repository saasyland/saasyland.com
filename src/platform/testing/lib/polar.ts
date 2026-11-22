import type { models } from "@polar-sh/sdk/2026-10"
import { createHmac } from "node:crypto"

import { POLAR_LICENSE_KEY_STATUS, POLAR_RECURRING_INTERVAL } from "~/src/integrations/polar/polar.constants"

const MS_PER_SECOND = 1000
export const POLAR_API_VERSION = "2026-10"
const DISPLAYED_KEY_CHARACTERS = 6
const CATALOGUE_CREATED_AT = "2026-11-01T00:00:00.000Z"
const RECURRING_INTERVAL_COUNT = 1
const DAYS_PER_WEEK = 7

export interface PolarProduct {
  readonly id: string
  readonly name: string
  readonly price: { readonly amount: number; readonly currency: string }
  readonly recurringInterval: models.RecurringInterval | null
  readonly requiredCheckboxes?: readonly string[]
}

export interface PolarLicenseKeyBenefit {
  readonly activationLimit: number
  readonly id: string
  readonly prefix: string
  readonly products: readonly PolarProduct[]
}

export interface PolarCatalogue {
  readonly licenseKeyBenefits: readonly PolarLicenseKeyBenefit[]
  readonly products: readonly PolarProduct[]
}

const productFields = (organizationId: string, { id, name, recurringInterval }: PolarProduct): Omit<models.OrderProduct, "metadata"> => ({
  created_at: CATALOGUE_CREATED_AT,
  description: null,
  id,
  is_archived: false,
  is_recurring: recurringInterval !== null,
  meter_interval: null,
  meter_interval_count: null,
  modified_at: null,
  name,
  organization_id: organizationId,
  recurring_interval: recurringInterval,
  recurring_interval_count: recurringInterval === null ? null : RECURRING_INTERVAL_COUNT,
  trial_interval: null,
  trial_interval_count: null,
  visibility: "public",
})

export const polarOrderProduct = (organizationId: string, product: PolarProduct): models.OrderProduct => ({
  ...productFields(organizationId, product),
  metadata: {},
})

export const polarProductPrice = ({ id, price }: PolarProduct): models.ProductPriceFixed => ({
  amount_type: "fixed",
  created_at: CATALOGUE_CREATED_AT,
  id: `${id}-price`,
  is_archived: false,
  modified_at: null,
  price_amount: price.amount,
  price_currency: price.currency.toLowerCase(),
  product_id: id,
  source: "catalog",
  tax_behavior: null,
})

export const polarCheckoutProduct = (organizationId: string, product: PolarProduct): models.CheckoutProduct => ({
  ...productFields(organizationId, product),
  benefits: [],
  medias: [],
  prices: [polarProductPrice(product)],
})

export const polarCustomer = (organizationId: string, externalId: string): models.CustomerIndividual => ({
  avatar_url: null,
  billing_address: null,
  billing_name: null,
  created_at: new Date().toISOString(),
  deleted_at: null,
  email: `${externalId}@example.test`,
  email_verified: true,
  external_id: externalId,
  first_user_event_at: null,
  id: crypto.randomUUID(),
  metadata: {},
  modified_at: null,
  name: null,
  organization_id: organizationId,
  tax_id: null,
  type: "individual",
})

export const polarOrderDiscount = ({
  basisPoints,
  code,
  name,
  organizationId,
}: {
  readonly basisPoints: number
  readonly code: string | null
  readonly name: string
  readonly organizationId: string
}): models.DiscountPercentageOnceForeverDurationBase => ({
  basis_points: basisPoints,
  code,
  created_at: new Date().toISOString(),
  duration: "once",
  ends_at: null,
  id: crypto.randomUUID(),
  max_redemptions: null,
  max_redemptions_per_customer: null,
  metadata: {},
  modified_at: null,
  name,
  organization_id: organizationId,
  redemptions_count: 0,
  starts_at: null,
  type: "percentage",
})

interface PolarOrderInput {
  readonly checkoutId: string | null
  readonly customer: models.CustomerIndividual
  readonly metadata: models.MetadataOutputType
  readonly product: PolarProduct
  readonly status: models.OrderStatus
}

export const polarOrder = ({ checkoutId, customer, metadata, product, status }: PolarOrderInput): models.Order => {
  const createdAt = new Date().toISOString()
  const { amount } = product.price
  const orderProduct = polarOrderProduct(customer.organization_id, product)

  return {
    applied_balance_amount: 0,
    billing_address: null,
    billing_name: null,
    billing_reason: "purchase",
    checkout_id: checkoutId,
    created_at: createdAt,
    currency: product.price.currency.toLowerCase(),
    customer,
    customer_id: customer.id,
    description: orderProduct.name,
    discount: null,
    discount_amount: 0,
    discount_id: null,
    due_amount: 0,
    id: crypto.randomUUID(),
    invoice_number: null,
    is_invoice_generated: false,
    items: [
      {
        amount,
        created_at: createdAt,
        end_timestamp: null,
        id: crypto.randomUUID(),
        label: orderProduct.name,
        modified_at: null,
        product_price_id: polarProductPrice(product).id,
        proration: false,
        start_timestamp: null,
        tax_amount: 0,
      },
    ],
    metadata,
    modified_at: null,
    net_amount: amount,
    paid: true,
    platform_fee_amount: 0,
    platform_fee_currency: null,
    product: orderProduct,
    product_id: orderProduct.id,
    receipt_number: null,
    refundable_amount: amount,
    refundable_tax_amount: 0,
    refunded_amount: 0,
    refunded_tax_amount: 0,
    status,
    subscription: null,
    subscription_id: null,
    subtotal_amount: amount,
    tax_amount: 0,
    total_amount: amount,
    units: null,
  }
}

const polarProduct = (organizationId: string, product: PolarProduct): models.Product => ({
  ...productFields(organizationId, product),
  attached_custom_fields: [],
  benefits: [],
  is_deletable: false,
  medias: [],
  metadata: {},
  prices: [polarProductPrice(product)],
})

const periodEnd = (start: Date, interval: models.RecurringInterval): Date => {
  const end = new Date(start)
  const advance = {
    [POLAR_RECURRING_INTERVAL.DAY]: () => end.setUTCDate(end.getUTCDate() + RECURRING_INTERVAL_COUNT),
    [POLAR_RECURRING_INTERVAL.WEEK]: () => end.setUTCDate(end.getUTCDate() + DAYS_PER_WEEK * RECURRING_INTERVAL_COUNT),
    [POLAR_RECURRING_INTERVAL.MONTH]: () => end.setUTCMonth(end.getUTCMonth() + RECURRING_INTERVAL_COUNT),
    [POLAR_RECURRING_INTERVAL.YEAR]: () => end.setUTCFullYear(end.getUTCFullYear() + RECURRING_INTERVAL_COUNT),
  } satisfies Record<models.RecurringInterval, () => number>
  advance[interval]()
  return end
}

interface PolarSubscriptionInput {
  readonly customer: models.CustomerIndividual
  readonly product: PolarProduct & { readonly recurringInterval: models.RecurringInterval }
  readonly status: models.SubscriptionStatus
}

export const polarSubscription = ({ customer, product, status }: PolarSubscriptionInput): models.Subscription => {
  const startedAt = new Date()
  const createdAt = startedAt.toISOString()

  return {
    amount: product.price.amount,
    cancel_at_period_end: false,
    canceled_at: null,
    checkout_id: null,
    created_at: createdAt,
    currency: product.price.currency.toLowerCase(),
    current_meter_period_end: null,
    current_meter_period_start: null,
    current_period_end: periodEnd(startedAt, product.recurringInterval).toISOString(),
    current_period_start: createdAt,
    customer,
    customer_cancellation_comment: null,
    customer_cancellation_reason: null,
    customer_id: customer.id,
    discount: null,
    discount_id: null,
    ended_at: null,
    ends_at: null,
    id: crypto.randomUUID(),
    metadata: {},
    meters: [],
    modified_at: null,
    pause_at_period_end: false,
    paused_at: null,
    pending_update: null,
    prices: [polarProductPrice(product)],
    product: polarProduct(customer.organization_id, product),
    product_id: product.id,
    recurring_interval: product.recurringInterval,
    recurring_interval_count: RECURRING_INTERVAL_COUNT,
    resumes_at: null,
    started_at: createdAt,
    status,
    trial_end: null,
    trial_start: null,
    units: null,
  }
}

export const polarLicenseKey = ({
  activations = [],
  benefit,
  customer,
  id = crypto.randomUUID(),
  key = `${benefit.prefix}-${crypto.randomUUID().toUpperCase()}`,
}: {
  readonly activations?: models.LicenseKeyActivationBase[]
  readonly benefit: PolarLicenseKeyBenefit
  readonly customer: models.CustomerIndividual
  readonly id?: string
  readonly key?: string
}): models.LicenseKeyWithActivations => ({
  activations,
  benefit_id: benefit.id,
  created_at: new Date().toISOString(),
  customer,
  customer_id: customer.id,
  display_key: `****-${key.slice(-DISPLAYED_KEY_CHARACTERS)}`,
  expires_at: null,
  id,
  key,
  last_validated_at: null,
  limit_activations: benefit.activationLimit,
  limit_usage: null,
  member: null,
  member_id: null,
  modified_at: null,
  organization_id: customer.organization_id,
  status: POLAR_LICENSE_KEY_STATUS.GRANTED,
  usage: 0,
  validations: 0,
})

export const polarLicenseKeyGrant = ({
  benefit,
  customer,
  licenseKey,
  orderId,
}: {
  readonly benefit: PolarLicenseKeyBenefit
  readonly customer: models.CustomerIndividual
  readonly licenseKey: models.LicenseKeyWithActivations
  readonly orderId: string
}): models.BenefitGrantLicenseKeysWebhook => ({
  benefit: {
    created_at: CATALOGUE_CREATED_AT,
    deletable: true,
    description: `${benefit.prefix} licence key`,
    id: benefit.id,
    is_deleted: false,
    metadata: {},
    modified_at: null,
    organization_id: licenseKey.organization_id,
    properties: {
      activations: { enable_customer_admin: true, limit: benefit.activationLimit },
      expires: null,
      limit_usage: null,
      prefix: benefit.prefix,
    },
    selectable: true,
    type: "license_keys",
    visibility: "public",
    visibility_configurable: false,
  },
  benefit_id: benefit.id,
  created_at: licenseKey.created_at,
  customer,
  customer_id: customer.id,
  granted_at: licenseKey.created_at,
  id: crypto.randomUUID(),
  is_granted: true,
  is_revoked: false,
  modified_at: null,
  order_id: orderId,
  properties: { display_key: licenseKey.display_key, license_key_id: licenseKey.id },
  revoked_at: null,
  subscription_id: null,
})

export const signedPolarWebhook = ({
  data,
  secret,
  sentAt = new Date(),
  type,
}: {
  readonly data: models.BenefitGrantWebhook | models.Order | models.Subscription
  readonly secret: string
  readonly sentAt?: Date
  readonly type: models.WebhookEventType
}): { body: string; headers: Record<string, string> } => {
  const body = JSON.stringify({ api_version: POLAR_API_VERSION, data, timestamp: sentAt.toISOString(), type })
  const id = `msg_${crypto.randomUUID()}`
  const timestamp = String(Math.floor(sentAt.getTime() / MS_PER_SECOND))
  const signature = createHmac("sha256", secret).update(`${id}.${timestamp}.${body}`).digest("base64")

  return {
    body,
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-signature": `v1,${signature}`,
      "webhook-timestamp": timestamp,
    },
  }
}
