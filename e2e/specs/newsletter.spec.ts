import type { APIRequestContext } from "@playwright/test"
import * as zod from "zod"

import { NEWSLETTER_STATUS, NEWSLETTER_STATUSES } from "../../src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { CONTACT_EMAIL } from "../../src/presentation/branding"
import { expect, test } from "../fixtures/test"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"

const emailsSchema = zod.array(zod.object({ html: zod.string(), subject: zod.string() }))
const subscriberSchema = zod.object({
  status: zod.enum(NEWSLETTER_STATUSES),
  unsubscribeToken: zod.string().length(64),
  unsubscribedAt: zod.number().nullable(),
})

const readEmails = async (request: APIRequestContext, recipient: string) => {
  const response = await request.get("/__test/emails", { params: { to: recipient } })
  expect(response.ok()).toBe(true)
  return emailsSchema.parse(await response.json())
}

const readSubscriber = async (request: APIRequestContext, email: string) => {
  const response = await request.get("/__test/newsletter", { params: { email } })
  expect(response.ok()).toBe(true)
  return subscriberSchema.parse(await response.json())
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
    (url) => url.pathname === "/pl-PL/newsletter/confirm" && url.searchParams.get("status") === "confirmed" && !url.searchParams.get("token"),
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
  expect(await unsubscribeResponse?.text()).toContain("Wypisać się z dziennika budowy?")
  await appPage.waitForAppReady()
  expect((await readSubscriber(request, email)).status).toBe(NEWSLETTER_STATUS.SUBSCRIBED)
  await page.getByRole("button", { exact: true, name: "Wypisz się" }).click()
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Jesteś wypisany." })).toBeVisible()
  await expect(page).toHaveURL(
    (url) => url.pathname === "/pl-PL/newsletter/unsubscribe" && url.searchParams.get("status") === "success" && !url.searchParams.get("token"),
  )
  const unsubscribed = await readSubscriber(request, email)
  expect(unsubscribed.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
  expect(unsubscribed.unsubscribedAt).not.toBeNull()

  await page.reload({ waitUntil: APP_NAVIGATION_WAIT_UNTIL })
  await appPage.waitForAppReady()
  await expect(page.getByRole("heading", { exact: true, level: 1, name: "Jesteś wypisany." })).toBeVisible()
  expect(await readSubscriber(request, email)).toEqual(unsubscribed)
  expect(await notifications()).toHaveLength(1)
})

for (const { path, heading } of [
  { path: "/newsletter/confirm", heading: "That link is spent." },
  { path: "/pl-PL/newsletter/confirm?token=invalid", heading: "Ten link jest już zużyty." },
  { path: "/newsletter/unsubscribe", heading: "We could not unsubscribe this address." },
  { path: "/pl-PL/newsletter/unsubscribe?token=invalid", heading: "Nie udało się anulować subskrypcji." },
]) {
  test(path, async ({ appPage, page }) => {
    const response = await page.goto(path, { waitUntil: APP_NAVIGATION_WAIT_UNTIL })
    expect(await response?.text()).toContain(heading)
    await appPage.waitForAppReady()
    await expect(page.getByRole("heading", { exact: true, level: 1, name: heading })).toBeVisible()
  })
}
