import assert from "node:assert/strict"

import type { APIRequestContext, Page } from "@playwright/test"
import * as zod from "zod"

import errors from "../../messages/en-US/errors.json" with { type: "json" }
import formMessages from "../../messages/en-US/components.custom.newsletter-form.json" with { type: "json" }
import confirmMessages from "../../messages/en-US/pages.newsletter.confirm.json" with { type: "json" }
import unsubscribeMessages from "../../messages/en-US/pages.newsletter.unsubscribe.json" with { type: "json" }
import cardMessages from "../../messages/de-DE/components.custom.newsletter-card.json" with { type: "json" }
import { I18N, type SupportedLocale } from "../../src/integrations/use-intl/i18n.config"
import {
  CONFIRMATION_STATUS,
  NEWSLETTER_EMAIL_PURPOSE,
  NEWSLETTER_SOURCE,
  NEWSLETTER_SOURCES,
  NEWSLETTER_STATUS,
  NEWSLETTER_STATUSES,
  UNSUBSCRIBE_STATUS,
} from "../../src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { ownAddress } from "../fixtures/address"
import { expect, test } from "../fixtures/auth"
import { expectVerificationEmail, getSentEmails } from "../fixtures/emails"
import { SIGN_UP_PASSWORD } from "../fixtures/sign-up"
import type { BasePage } from "../pages"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const SIGN_UP_ANSWER = {
  ACCEPTED: "accepted",
  REFUSED: "refused",
} as const

type SignUpAnswer = (typeof SIGN_UP_ANSWER)[keyof typeof SIGN_UP_ANSWER]

const ATTEMPTS_PAST_THE_LIMIT = 10
const SETTINGS_LOCALE = "de-DE" satisfies SupportedLocale

const emailsSchema = zod.array(zod.object({ html: zod.string(), subject: zod.string() }))
const subscriberSchema = zod.object({
  locale: zod.enum(I18N.SUPPORTED_LOCALES),
  source: zod.enum(NEWSLETTER_SOURCES),
  status: zod.enum(NEWSLETTER_STATUSES),
  unsubscribeToken: zod.string().length(64),
  unsubscribedAt: zod.number().nullable(),
})

const readEmails = async (request: APIRequestContext, recipient: string) => {
  const response = await request.get("/__test/emails", { params: { to: recipient } })
  expect(response.ok()).toBe(true)
  return emailsSchema.parse(await response.json())
}

const subscriberRow = async (request: APIRequestContext, email: string) => {
  const response = await request.get("/__test/newsletter", { params: { email } })
  expect(response.ok()).toBe(true)
  return subscriberSchema.nullable().parse(await response.json())
}

const readSubscriber = async (request: APIRequestContext, email: string) => {
  const subscriber = await subscriberRow(request, email)
  if (subscriber === null) throw new Error(`${email} has no newsletter row`)
  return subscriber
}

const confirmationEmails = async (request: APIRequestContext, recipient: string): Promise<number> =>
  (await getSentEmails(request, recipient)).filter(({ idempotencyKey }) =>
    idempotencyKey.startsWith(`${NEWSLETTER_EMAIL_PURPOSE.NEWSLETTER_CONFIRMATION}/`),
  ).length

const latestConfirmationLink = async (request: APIRequestContext, recipient: string, expected: number): Promise<URL> => {
  await expect.poll(async () => (await readEmails(request, recipient)).length).toBe(expected)
  const link = (await readEmails(request, recipient)).at(-1)?.html.match(/href="([^"]*\/newsletter\/confirm\?token=[^"]+)"/u)?.[1]
  if (!link) throw new Error("The newsletter email has no confirmation link")
  return new URL(link.replaceAll("&amp;", "&"))
}

const signUpFromFooter = async (appPage: BasePage, page: Page, email: string): Promise<SignUpAnswer> => {
  await page.goto(ROUTES.NEWSLETTER.UNSUBSCRIBE, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const footer = page.getByRole("contentinfo")
  await appPage.waitForHydration(footer.locator("form"))
  await footer.getByRole("textbox", { exact: true, name: formMessages.label }).fill(email)
  await footer.getByRole("button", { exact: true, name: formMessages.button }).click()
  const accepted = page.getByText(formMessages.confirmationSent, { exact: true })
  const refused = page.getByText(errors.codes.TOO_MANY_REQUESTS, { exact: true })
  await expect(accepted.or(refused)).toBeVisible()
  return (await refused.isVisible()) ? SIGN_UP_ANSWER.REFUSED : SIGN_UP_ANSWER.ACCEPTED
}

const pressOnPage = async (appPage: BasePage, page: Page, url: URL, action: string): Promise<void> => {
  await page.goto(url.toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("button", { exact: true, name: action }).click()
}

const openSettings = async (appPage: BasePage, page: Page) => {
  await page.goto(`/${SETTINGS_LOCALE}${ROUTES.APP.SETTINGS.INDEX}`, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  const buildLog = page.getByRole("switch", { exact: true, name: cardMessages.label })
  const label = page.locator("label").filter({ has: buildLog })
  await appPage.waitForHydration(label)
  return { buildLog, label }
}

test("localized newsletter signup, confirmation and unsubscribe survive hydration and refresh", async ({ appPage, landingPage, page, request }) => {
  const id = crypto.randomUUID()
  const email = `newsletter.${id}@example.test`
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": `2001:db8:${id.slice(0, 4)}::` })
  await landingPage.goto("/pl-PL")

  const footer = page.getByRole("contentinfo")
  const emailField = footer.getByRole("textbox", { exact: true, name: "Adres e-mail" })
  await emailField.scrollIntoViewIfNeeded()
  await expect(emailField).toBeEditable()
  await emailField.fill(email)
  await footer.getByRole("button", { exact: true, name: "Zapisz się" }).click()
  await expect.poll(async () => (await readEmails(request, email)).length).toBe(1)
  const [confirmation] = await readEmails(request, email)
  expect(confirmation?.subject).toBe("Jedno kliknięcie i jesteś z nami")
  expect(confirmation?.html).toContain('lang="pl-PL"')

  const link = confirmation?.html.match(/href="([^"]*\/newsletter\/confirm\?token=[^"]+)"/u)?.[1]
  if (!link) throw new Error("The newsletter email has no confirmation link")
  const confirmationUrl = new URL(link.replaceAll("&amp;", "&"))
  expect(confirmationUrl.origin).toBe(new URL(page.url()).origin)
  expect(confirmationUrl.pathname).toBe("/pl-PL/newsletter/confirm")
  expect((await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.PENDING)

  const response = await page.goto(confirmationUrl.toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  expect(await response?.text()).toContain("Jeszcze jedno kliknięcie.")
  await appPage.waitForAppReady()
  expect((await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.PENDING)
  await page.getByRole("button", { exact: true, name: "Potwierdź zapis" }).click()
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Jesteś z nami." })).toBeVisible()
  await expect(page).toHaveURL(
    (url) => url.pathname === "/pl-PL/newsletter/confirm" && url.searchParams.get("status") === CONFIRMATION_STATUS.CONFIRMED && !url.searchParams.get("token"),
  )
  expect((await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.SUBSCRIBED)
  const notifications = () => readEmails(request, CONTACT_EMAIL).then((emails) => emails.filter((message) => message.html.includes(email)))
  await expect.poll(async () => (await notifications()).length).toBe(1)

  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Jesteś z nami." })).toBeVisible()
  expect(await notifications()).toHaveLength(1)

  await page.goto(confirmationUrl.toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await page.getByRole("button", { exact: true, name: "Potwierdź zapis" }).click()
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Ten link jest już zużyty." })).toBeVisible()
  expect((await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.SUBSCRIBED)
  expect(await notifications()).toHaveLength(1)

  const subscribed = await readSubscriber(request, email)
  const unsubscribeUrl = new URL("/pl-PL/newsletter/unsubscribe", confirmationUrl.origin)
  unsubscribeUrl.searchParams.set("token", subscribed.unsubscribeToken)
  const unsubscribeResponse = await page.goto(unsubscribeUrl.toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  expect(await unsubscribeResponse?.text()).toContain("Zrezygnować z dziennika prac?")
  await appPage.waitForAppReady()
  expect((await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.SUBSCRIBED)
  await page.getByRole("button", { exact: true, name: "Wypisz się" }).click()
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Wypisano Cię z listy." })).toBeVisible()
  await expect(page).toHaveURL(
    (url) => url.pathname === "/pl-PL/newsletter/unsubscribe" && url.searchParams.get("status") === UNSUBSCRIBE_STATUS.SUCCESS && !url.searchParams.get("token"),
  )
  const unsubscribed = await readSubscriber(request, email)
  expect(unsubscribed.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
  expect(unsubscribed.unsubscribedAt).not.toBeNull()

  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Wypisano Cię z listy." })).toBeVisible()
  expect(await readSubscriber(request, email)).toEqual(unsubscribed)
  expect(await notifications()).toHaveLength(1)
})

for (const { path, heading } of [
  { path: "/newsletter/confirm", heading: "That link is spent." },
  { path: "/pl-PL/newsletter/confirm?token=invalid", heading: "Ten link jest już zużyty." },
  { path: "/newsletter/unsubscribe", heading: "We could not unsubscribe this address." },
  { path: "/pl-PL/newsletter/unsubscribe?token=invalid", heading: "Nie udało się wypisać tego adresu." },
]) {
  test(path, async ({ appPage, page }) => {
    const response = await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    expect(await response?.text()).toContain(heading)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { exact: true, level: 1, name: heading })).toBeVisible()
  })
}

test("an unsubscribed reader who signs up again gets a new confirmation email and is on the list again once they confirm it", async ({
  appPage,
  page,
  request,
}) => {
  const email = `newsletter-again.${crypto.randomUUID()}@example.test`
  const notifications = async () => (await readEmails(request, CONTACT_EMAIL)).filter((message) => message.html.includes(email))
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": ownAddress() })
  expect(await signUpFromFooter(appPage, page, email)).toBe(SIGN_UP_ANSWER.ACCEPTED)
  const first = await latestConfirmationLink(request, email, 1)
  await pressOnPage(appPage, page, first, confirmMessages.prompt.action)
  await expect(page.getByRole("heading", { exact: true, level: 1, name: confirmMessages.confirmed.title })).toBeVisible()
  const unsubscribeUrl = new URL(ROUTES.NEWSLETTER.UNSUBSCRIBE, first.origin)
  unsubscribeUrl.searchParams.set("token", (await readSubscriber(request, email)).unsubscribeToken)
  await pressOnPage(appPage, page, unsubscribeUrl, unsubscribeMessages.prompt.action)
  await expect(page.getByRole("heading", { exact: true, level: 1, name: unsubscribeMessages.success.title })).toBeVisible()
  const unsubscribed = await readSubscriber(request, email)
  expect(unsubscribed.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)

  expect(await signUpFromFooter(appPage, page, email)).toBe(SIGN_UP_ANSWER.ACCEPTED)
  const second = await latestConfirmationLink(request, email, 2)
  expect(second.searchParams.get("token")).not.toBe(first.searchParams.get("token"))
  expect(await readSubscriber(request, email)).toMatchObject({ status: NEWSLETTER_STATUS.PENDING, unsubscribedAt: unsubscribed.unsubscribedAt })
  await pressOnPage(appPage, page, first, confirmMessages.prompt.action)
  await expect(page.getByRole("heading", { exact: true, level: 1, name: confirmMessages.expired.title })).toBeVisible()
  expect((await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.PENDING)

  await pressOnPage(appPage, page, second, confirmMessages.prompt.action)
  await expect(page.getByRole("heading", { exact: true, level: 1, name: confirmMessages.confirmed.title })).toBeVisible()
  expect(await readSubscriber(request, email)).toMatchObject({ status: NEWSLETTER_STATUS.SUBSCRIBED, unsubscribedAt: null })
  await expect.poll(async () => (await notifications()).length).toBe(2)
})

test("sign-ups from one client address past the limit are refused and send nothing, while another client address still signs up", async ({
  appPage,
  page,
  request,
}) => {
  const answers: { readonly answer: SignUpAnswer; readonly email: string }[] = []
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": ownAddress() })
  for (let attempt = 0; attempt < ATTEMPTS_PAST_THE_LIMIT && answers.at(-1)?.answer !== SIGN_UP_ANSWER.REFUSED; attempt += 1) {
    const email = `newsletter-limit.${crypto.randomUUID()}@example.test`
    answers.push({ answer: await signUpFromFooter(appPage, page, email), email })
  }

  const refused = answers.at(-1)
  assert(refused !== undefined)
  expect(answers.at(0)?.answer).toBe(SIGN_UP_ANSWER.ACCEPTED)
  expect(refused.answer).toBe(SIGN_UP_ANSWER.REFUSED)
  for (const { email } of answers.slice(0, -1)) {
    await expect.poll(async () => confirmationEmails(request, email)).toBe(1)
  }
  const { email } = refused
  expect(await confirmationEmails(request, email)).toBe(0)
  expect(await subscriberRow(request, email)).toBeNull()

  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": ownAddress() })
  expect(await signUpFromFooter(appPage, page, email)).toBe(SIGN_UP_ANSWER.ACCEPTED)
  await expect.poll(async () => confirmationEmails(request, email)).toBe(1)
})

test("a signed-in customer turns the build log on and off from the settings in the page's language once the address is confirmed", async ({
  appPage,
  authPage,
  page,
  request,
}) => {
  const email = `newsletter-app.${crypto.randomUUID()}@example.test`
  await page.setExtraHTTPHeaders({ "CF-Connecting-IP": ownAddress() })
  await authPage.signUp(email, SIGN_UP_PASSWORD)
  await expect(page).not.toHaveURL(/\/auth\//u)
  const unconfirmed = await openSettings(appPage, page)
  await expect(page.getByRole("heading", { exact: true, level: 2, name: cardMessages.title })).toBeVisible()
  await expect(unconfirmed.buildLog).toBeDisabled()
  await expect(unconfirmed.buildLog).toHaveAccessibleDescription(cardMessages.unconfirmed)
  await page.goto((await expectVerificationEmail(request, email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()

  const { buildLog, label } = await openSettings(appPage, page)
  await expect(buildLog).not.toBeChecked()
  await expect(buildLog).toHaveAccessibleDescription(cardMessages.delivery)
  await label.click()
  await expect(page.getByText(cardMessages.subscribed, { exact: true })).toBeVisible()
  await expect(buildLog).toBeChecked()
  expect(await readSubscriber(request, email)).toMatchObject({
    locale: SETTINGS_LOCALE,
    source: NEWSLETTER_SOURCE.APP,
    status: NEWSLETTER_STATUS.SUBSCRIBED,
    unsubscribedAt: null,
  })
  expect(await confirmationEmails(request, email)).toBe(0)

  const subscribed = await openSettings(appPage, page)
  await expect(subscribed.buildLog).toBeChecked()
  await subscribed.label.click()
  await expect(page.getByText(cardMessages.unsubscribed, { exact: true })).toBeVisible()
  await expect(subscribed.buildLog).not.toBeChecked()
  const unsubscribed = await readSubscriber(request, email)
  expect(unsubscribed.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
  expect(unsubscribed.unsubscribedAt).not.toBeNull()

  const off = await openSettings(appPage, page)
  await expect(off.buildLog).not.toBeChecked()
  await expect(off.buildLog).toBeEnabled()
})
