import { render, screen, within } from "@testing-library/react"
import { createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { Route as AffiliatesRoute } from "~/src/routes/_site._marketing.affiliates"
import { Route as LicenceRoute } from "~/src/routes/_site._marketing.licence"
import { Route as PrivacyRoute } from "~/src/routes/_site._marketing.privacy"
import { Route as RefundsRoute } from "~/src/routes/_site._marketing.refunds"
import { Route as TermsRoute } from "~/src/routes/_site._marketing.terms"

import { AFFILIATE_PORTAL_URL, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"
import { SIDEBAR_COOKIE } from "~/src/data/sidebar"

import affiliates from "~/messages/en-US/pages.legal.affiliates.json"
import licence from "~/messages/en-US/pages.legal.licence.json"
import privacy from "~/messages/en-US/pages.legal.privacy.json"
import refunds from "~/messages/en-US/pages.legal.refunds.json"
import terms from "~/messages/en-US/pages.legal.terms.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"

const DOCUMENTS = [
  { copy: affiliates, document: "affiliates", route: AffiliatesRoute },
  { copy: licence, document: "licence", route: LicenceRoute },
  { copy: privacy, document: "privacy", route: PrivacyRoute },
  { copy: refunds, document: "refunds", route: RefundsRoute },
  { copy: terms, document: "terms", route: TermsRoute },
] as const

const PORTAL_HOST = new URL(AFFILIATE_PORTAL_URL).host

const joinCopySchema = zod.object({ body: zod.string(), title: zod.string() })
const affiliatesCopySchema = zod.object({ description: zod.string(), sections: zod.object({ join: joinCopySchema }) })
const affiliatesMessagesSchema = zod.object({ pages: zod.object({ legal: zod.object({ affiliates: affiliatesCopySchema }) }) })

const affiliatesPageWith = async (program: FeatureStatus) => {
  vi.resetModules()
  vi.doMock(import("~/src/data/affiliates"), async (importOriginal) => ({ ...(await importOriginal()), AFFILIATE_PROGRAM: program }))
  const { Route } = await import("~/src/routes/_site._marketing.affiliates")
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("The affiliates route has no page component")
  }

  return Page
}

const affiliatesCopy = ({ locale, program }: { locale: SupportedLocale; program: FeatureStatus }) => {
  const t = createTranslator({ locale, messages: affiliatesMessagesSchema.parse(getTestMessages(locale)).pages.legal.affiliates })
  const values = {
    ...CLI_GENERATION_VALUES,
    commission: AFFILIATE_TERMS.COMMISSION_PERCENT,
    email: CONTACT_EMAIL,
    portal: PORTAL_HOST,
    program,
  }

  return {
    join: t.markup("sections.join.body", { ...values, link: (chunks) => chunks }),
    joinTitle: t("sections.join.title"),
    lead: t("description", values),
  }
}

const renderAffiliates = async ({ locale, program }: { locale: SupportedLocale; program: FeatureStatus }) => {
  const Page = await affiliatesPageWith(program)
  const copy = affiliatesCopy({ locale, program })
  const view = render(
    <IntlProvider locale={locale} messages={getTestMessages(locale)}>
      <Page />
    </IntlProvider>,
  )

  return { copy, join: within(view.container).getByRole("heading", { name: copy.joinTitle }).nextElementSibling, view }
}

const cookiesCopySchema = zod.object({ sections: zod.object({ cookies: joinCopySchema }) })
const privacyMessagesSchema = zod.object({ pages: zod.object({ legal: zod.object({ privacy: cookiesCopySchema }) }) })

const renderPrivacy = async ({ locale, program }: { locale: SupportedLocale; program: FeatureStatus }) => {
  vi.resetModules()
  vi.doMock(import("~/src/data/affiliates"), async (importOriginal) => ({ ...(await importOriginal()), AFFILIATE_PROGRAM: program }))
  const { Route } = await import("~/src/routes/_site._marketing.privacy")
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("The privacy route has no page component")
  }
  const t = createTranslator({ locale, messages: privacyMessagesSchema.parse(getTestMessages(locale)).pages.legal.privacy })
  const copy = t("sections.cookies.body", {
    cookieDays: AFFILIATE_TERMS.COOKIE_DAYS,
    email: CONTACT_EMAIL,
    program,
    sidebarDays: SIDEBAR_COOKIE.DAYS,
  })
  const view = render(
    <IntlProvider locale={locale} messages={getTestMessages(locale)}>
      <Page />
    </IntlProvider>,
  )

  return { cookies: within(view.container).getByRole("heading", { name: t("sections.cookies.title") }).nextElementSibling, copy, view }
}

afterEach(() => {
  vi.doUnmock("~/src/data/affiliates")
})

it.each(I18N.SUPPORTED_LOCALES)("renders every legal document completely in %s", (locale) => {
  const messages = getTestMessages(locale)

  for (const { copy, document, route } of DOCUMENTS) {
    const Page = route.options.component
    if (Page === undefined) {
      throw new Error(`The ${document} route has no page component`)
    }
    const view = renderWithRouter(
      <IntlProvider locale={locale} messages={messages}>
        <Page />
      </IntlProvider>,
    )
    const title = screen.getByRole("heading", { level: 1 })
    expect(messages).toHaveProperty(["pages", "legal", document, "title"], title.textContent)
    expect(messages).toHaveProperty(["pages", "legal", document, "lastUpdated"], title.nextElementSibling?.nextElementSibling?.textContent)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(Object.keys(copy.sections).length)
    expect(view.container).toHaveTextContent(CONTACT_EMAIL)
    expect(view.container).not.toHaveTextContent(`pages.legal.${document}`)
    view.unmount()
  }
})

describe.each(I18N.SUPPORTED_LOCALES)("the affiliate terms in %s", (locale) => {
  it("send partners to the partner portal while the programme is open", async () => {
    const { copy, join, view } = await renderAffiliates({ locale, program: FEATURE_STATUS.AVAILABLE })

    expect(within(view.container).getByText(copy.lead)).toBeVisible()
    expect(join?.textContent).toBe(copy.join)
    expect(within(view.container).getByRole("link", { name: PORTAL_HOST })).toHaveAttribute("href", AFFILIATE_PORTAL_URL)
    view.unmount()
  })

  it("keep every term but ask partners to write in, without the portal, while the programme is arriving", async () => {
    const open = affiliatesCopy({ locale, program: FEATURE_STATUS.AVAILABLE })
    const { copy, join, view } = await renderAffiliates({ locale, program: FEATURE_STATUS.ARRIVING })

    expect(within(view.container).getByText(copy.lead)).toBeVisible()
    expect(copy.lead).not.toBe(open.lead)
    expect(join?.textContent).toBe(copy.join)
    expect(copy.join).not.toBe(open.join)
    expect(join).toHaveTextContent(CONTACT_EMAIL)
    expect(within(view.container).queryByRole("link", { name: PORTAL_HOST })).toBeNull()
    expect(within(view.container).getAllByRole("heading", { level: 2 })).toHaveLength(Object.keys(affiliates.sections).length)
    view.unmount()
  })
})

describe.each(I18N.SUPPORTED_LOCALES)("the privacy policy in %s", (locale) => {
  it("describes the referral script as loaded only while the affiliate programme is open", async () => {
    const open = await renderPrivacy({ locale, program: FEATURE_STATUS.AVAILABLE })
    expect(open.cookies?.textContent).toBe(open.copy)
    open.view.unmount()

    const arriving = await renderPrivacy({ locale, program: FEATURE_STATUS.ARRIVING })
    expect(arriving.cookies?.textContent).toBe(arriving.copy)
    expect(arriving.copy).not.toBe(open.copy)
    expect(arriving.cookies).toHaveTextContent(String(SIDEBAR_COOKIE.DAYS))
    arriving.view.unmount()
  })
})
