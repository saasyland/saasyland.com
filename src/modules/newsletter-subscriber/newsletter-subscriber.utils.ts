import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { CONFIRMATION_WINDOW_IN_HOURS, NEWSLETTER_TOKEN_LENGTH } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"

import { randomHex } from "~/src/lib/hex"

import { ROUTES } from "~/src/routes"

const MILLISECONDS_PER_HOUR = 3_600_000

export const createToken = (): string => randomHex(NEWSLETTER_TOKEN_LENGTH)

export const confirmationExpiry = (): Date => new Date(Date.now() + CONFIRMATION_WINDOW_IN_HOURS * MILLISECONDS_PER_HOUR)

interface NewsletterTokenUrlOptions {
  readonly locale: SupportedLocale
  readonly origin: string
  readonly token: string
}

const newsletterTokenUrl = (pathname: string, { locale, origin, token }: NewsletterTokenUrlOptions): string => {
  const url = new URL(localizePathname({ locale, pathname }), origin)
  url.searchParams.set("token", token)
  return url.toString()
}

export const confirmationUrl = (options: NewsletterTokenUrlOptions): string => newsletterTokenUrl(ROUTES.NEWSLETTER_CONFIRM, options)

export const unsubscribeUrl = (options: NewsletterTokenUrlOptions): string => newsletterTokenUrl(ROUTES.NEWSLETTER_UNSUBSCRIBE, options)
