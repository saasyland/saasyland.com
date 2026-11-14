import type { models } from "@polar-sh/sdk/2026-10"
import { createHmac } from "node:crypto"

import { BASIS_POINTS_PER_PERCENT } from "~/src/integrations/polar/polar.discounts"

import { toMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE, PPP_PERCENT } from "~/src/modules/_core/constants/pricing"
import type { LicenseTier } from "~/src/modules/license/license.constants"

import { TIER_PRICES } from "~/src/data/marketing"

const MS_PER_SECOND = 1000
const POLAR_API_VERSION = "2026-10"
const LICENSE_KEY_PREFIX = "SAASYLAND"
const DISPLAYED_KEY_CHARACTERS = 6
const CATALOGUE_CREATED_AT = "2026-11-01T00:00:00.000Z"
const CURRENCY = DEFAULT_CURRENCY_CODE.toLowerCase()
const UUID_NODE_DIGITS = 12

export interface PolarCatalogue {
  readonly organizationId: string
  readonly productIds: Readonly<Record<LicenseTier, string>>
}

export const polarPrice = (tier: LicenseTier): number => toMinorUnits(TIER_PRICES[tier], DEFAULT_CURRENCY_CODE)

export const polarDiscountAmount = (amount: number, discount: models.DiscountPercentageOnceForeverDurationBase | null): number =>
  discount === null ? 0 : Math.round((amount * discount.basis_points) / (BASIS_POINTS_PER_PERCENT * PPP_PERCENT))

const productFields = ({ organizationId, productIds }: PolarCatalogue, tier: LicenseTier): Omit<models.OrderProduct, "metadata"> => ({
  created_at: CATALOGUE_CREATED_AT,
  description: null,
  id: productIds[tier],
  is_archived: false,
  is_recurring: false,
  meter_interval: null,
  meter_interval_count: null,
  modified_at: null,
  name: tier,
  organization_id: organizationId,
  recurring_interval: null,
  recurring_interval_count: null,
  trial_interval: null,
  trial_interval_count: null,
  visibility: "public",
})

export const polarOrderProduct = (catalogue: PolarCatalogue, tier: LicenseTier): models.OrderProduct => ({
  ...productFields(catalogue, tier),
  metadata: {},
})

export const polarProductPrice = ({ productIds }: PolarCatalogue, tier: LicenseTier): models.ProductPriceFixed => ({
  amount_type: "fixed",
  created_at: CATALOGUE_CREATED_AT,
  id: `${productIds[tier]}-price`,
  is_archived: false,
  modified_at: null,
  price_amount: polarPrice(tier),
  price_currency: CURRENCY,
  product_id: productIds[tier],
  source: "catalog",
  tax_behavior: null,
})

export const polarCheckoutProduct = (catalogue: PolarCatalogue, tier: LicenseTier): models.CheckoutProduct => ({
  ...productFields(catalogue, tier),
  benefits: [],
  medias: [],
  prices: [polarProductPrice(catalogue, tier)],
})

export const polarDiscount = (
  { organizationId }: PolarCatalogue,
  basisPoints: number,
): models.DiscountPercentageOnceForeverDurationBase => ({
  basis_points: basisPoints,
  code: null,
  created_at: CATALOGUE_CREATED_AT,
  duration: "once",
  ends_at: null,
  id: `00000000-0000-4000-8000-${String(basisPoints).padStart(UUID_NODE_DIGITS, "0")}`,
  max_redemptions: null,
  max_redemptions_per_customer: null,
  metadata: {},
  modified_at: null,
  name: `Regional pricing ${String(basisPoints / BASIS_POINTS_PER_PERCENT)}%`,
  organization_id: organizationId,
  redemptions_count: 0,
  starts_at: null,
  type: "percentage",
})

export const polarCustomer = ({ organizationId }: PolarCatalogue, externalId: string): models.CustomerIndividual => ({
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

interface PolarOrderInput {
  readonly catalogue: PolarCatalogue
  readonly checkoutId: string | null
  readonly customer: models.CustomerIndividual
  readonly discount: models.DiscountPercentageOnceForeverDurationBase | null
  readonly metadata: models.MetadataOutputType
  readonly status: models.OrderStatus
  readonly tier: LicenseTier
}

export const polarOrder = ({ catalogue, checkoutId, customer, discount, metadata, status, tier }: PolarOrderInput): models.Order => {
  const createdAt = new Date().toISOString()
  const subtotal = polarPrice(tier)
  const net = subtotal - polarDiscountAmount(subtotal, discount)
  const product = polarOrderProduct(catalogue, tier)

  return {
    applied_balance_amount: 0,
    billing_address: null,
    billing_name: null,
    billing_reason: "purchase",
    checkout_id: checkoutId,
    created_at: createdAt,
    currency: CURRENCY,
    customer,
    customer_id: customer.id,
    description: product.name,
    discount,
    discount_amount: subtotal - net,
    discount_id: discount?.id ?? null,
    due_amount: 0,
    id: crypto.randomUUID(),
    invoice_number: null,
    is_invoice_generated: false,
    items: [
      {
        amount: subtotal,
        created_at: createdAt,
        end_timestamp: null,
        id: crypto.randomUUID(),
        label: product.name,
        modified_at: null,
        product_price_id: polarProductPrice(catalogue, tier).id,
        proration: false,
        start_timestamp: null,
        tax_amount: 0,
      },
    ],
    metadata,
    modified_at: null,
    net_amount: net,
    paid: true,
    platform_fee_amount: 0,
    platform_fee_currency: null,
    product,
    product_id: product.id,
    receipt_number: null,
    refundable_amount: net,
    refundable_tax_amount: 0,
    refunded_amount: 0,
    refunded_tax_amount: 0,
    status,
    subscription: null,
    subscription_id: null,
    subtotal_amount: subtotal,
    tax_amount: 0,
    total_amount: net,
    units: null,
  }
}

export const polarLicenseKey = ({
  activationLimit,
  activations = [],
  benefitId,
  customer,
  id = crypto.randomUUID(),
  key = `${LICENSE_KEY_PREFIX}-${crypto.randomUUID().toUpperCase()}`,
}: {
  readonly activationLimit: number
  readonly activations?: models.LicenseKeyActivationBase[]
  readonly benefitId: string
  readonly customer: models.CustomerIndividual
  readonly id?: string
  readonly key?: string
}): models.LicenseKeyWithActivations => ({
  activations,
  benefit_id: benefitId,
  created_at: new Date().toISOString(),
  customer,
  customer_id: customer.id,
  display_key: `****-${key.slice(-DISPLAYED_KEY_CHARACTERS)}`,
  expires_at: null,
  id,
  key,
  last_validated_at: null,
  limit_activations: activationLimit,
  limit_usage: null,
  member: null,
  member_id: null,
  modified_at: null,
  organization_id: customer.organization_id,
  status: "granted",
  usage: 0,
  validations: 0,
})

export const polarLicenseKeyGrant = ({
  activationLimit,
  customer,
  licenseKey,
  orderId,
}: {
  readonly activationLimit: number
  readonly customer: models.CustomerIndividual
  readonly licenseKey: models.LicenseKeyWithActivations
  readonly orderId: string
}): models.BenefitGrantLicenseKeysWebhook => ({
  benefit: {
    created_at: CATALOGUE_CREATED_AT,
    deletable: true,
    description: `${LICENSE_KEY_PREFIX} licence key`,
    id: licenseKey.benefit_id,
    is_deleted: false,
    metadata: {},
    modified_at: null,
    organization_id: licenseKey.organization_id,
    properties: {
      activations: { enable_customer_admin: true, limit: activationLimit },
      expires: null,
      limit_usage: null,
      prefix: LICENSE_KEY_PREFIX,
    },
    selectable: true,
    type: "license_keys",
    visibility: "public",
    visibility_configurable: false,
  },
  benefit_id: licenseKey.benefit_id,
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
  readonly data: models.BenefitGrantWebhook | models.Order
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
