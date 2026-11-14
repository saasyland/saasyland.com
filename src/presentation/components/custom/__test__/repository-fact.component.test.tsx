import type { ReactNode } from "react"

import { render, screen, within } from "@testing-library/react"
import { adminAc } from "better-auth/plugins/admin/access"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"
import zod from "zod/v4"

import { APP_STATEMENTS } from "~/src/integrations/better-auth/auth.access"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { PPP_TIERS } from "~/src/modules/_core/constants/pricing"
import { PLAYBACK_TTL_SECONDS } from "~/src/modules/video/video.playback"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { MILLISECONDS_PER_SECOND, MINUTES_PER_HOUR, SECONDS_PER_MINUTE } from "~/src/lib/duration"
import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/lib/rate-limit"

import { RepositoryFact, RepositoryTable } from "~/src/presentation/components/custom/repository-fact"

import { COMMIT_EMOJIS } from "~/scripts/commit-msg"
import { getRouter } from "~/src/router"

vi.mock("~/src/routeTree.gen", async () => {
  const { createRootRoute } = await import("@tanstack/react-router")

  return { routeTree: createRootRoute() }
})

const MILLISECONDS_PER_MINUTE = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE

const renderInLocale = (locale: SupportedLocale, children: ReactNode) =>
  render(
    <IntlProvider locale={locale} messages={{}} timeZone="UTC">
      <div data-testid="fact">{children}</div>
    </IntlProvider>,
  )

const listItems = (): (string | null)[] => screen.getAllByRole("listitem").map((item) => item.textContent)

const tableRows = (): string[][] =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .map((row) =>
      within(row)
        .queryAllByRole("cell")
        .map((cell) => cell.textContent),
    )

describe("RepositoryFact", () => {
  it.each(["en-US", "de-DE"] as const)("prints a measured repository count formatted for %s", (locale) => {
    renderInLocale(
      locale,
      <>
        <RepositoryFact name="testFiles" /> test files
      </>,
    )

    expect(screen.getByText(`${new Intl.NumberFormat(locale).format(REPOSITORY_FACTS.testFiles)} test files`)).toBeVisible()
  })

  it.each(["en-US", "pl-PL", "ja-JP"] as const)("prints a duration in the unit the page names for %s", (locale) => {
    renderInLocale(locale, <RepositoryFact name="signedMediaHours" unit="hour" />)

    expect(screen.getByTestId("fact")).toHaveTextContent(
      new Intl.NumberFormat(locale, { style: "unit", unit: "hour", unitDisplay: "long" }).format(
        PLAYBACK_TTL_SECONDS / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR),
      ),
    )
  })

  it("prints a percentage with the locale's percent sign", () => {
    renderInLocale("fr-FR", <RepositoryFact name="coverageThreshold" unit="percent" />)

    expect(screen.getByTestId("fact").textContent).toBe(
      new Intl.NumberFormat("fr-FR", { style: "unit", unit: "percent" }).format(REPOSITORY_FACTS.coverageThreshold),
    )
  })

  it("prints a text fact as code", () => {
    renderInLocale("en-US", <RepositoryFact name="nodeVersion" />)

    expect(screen.getByText(REPOSITORY_FACTS.nodeVersion).tagName).toBe("CODE")
  })

  it.each(["en-US", "ja-JP"] as const)("prints a list fact as a %s list of code", (locale) => {
    renderInLocale(locale, <RepositoryFact name="supportedLocales" />)

    expect(screen.getByTestId("fact").querySelectorAll("code")).toHaveLength(I18N.SUPPORTED_LOCALES.length)
    expect(screen.getByTestId("fact")).toHaveTextContent(new Intl.ListFormat(locale).format(I18N.SUPPORTED_LOCALES))
  })

  it("prints the router and query cache times the router is created with", () => {
    const router = getRouter()
    const { gcTime, staleTime } = zod
      .object({ gcTime: zod.number(), staleTime: zod.number() })
      .parse(router.options.context.queryClient.getDefaultOptions().queries)
    renderInLocale(
      "en-US",
      <ul>
        <li>
          <RepositoryFact name="queryStaleTimeMinutes" unit="minute" />
        </li>
        <li>
          <RepositoryFact name="queryGcTimeMinutes" unit="minute" />
        </li>
        <li>
          <RepositoryFact name="routerStaleTimeMinutes" unit="minute" />
        </li>
      </ul>,
    )

    expect(listItems()).toEqual(
      [staleTime, gcTime, zod.number().parse(router.options.defaultStaleTime)].map((milliseconds) =>
        new Intl.NumberFormat("en-US", { style: "unit", unit: "minute", unitDisplay: "long" }).format(
          milliseconds / MILLISECONDS_PER_MINUTE,
        ),
      ),
    )
  })

  it("prints the per-recipient email limit that the server-only rate limiter applies", () => {
    renderInLocale("en-US", <RepositoryFact name="recipientEmailsPerHour" />)

    expect(screen.getByTestId("fact")).toHaveTextContent(String(RECIPIENT_EMAILS_PER_HOUR))
  })
})

describe("RepositoryTable", () => {
  it("prints the application statements under the page's column names", () => {
    renderInLocale("en-US", <RepositoryTable columns={["Resource", "Actions"]} name="appStatements" />)

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Resource", "Actions"])
    expect(tableRows().slice(1)).toEqual(
      Object.entries(APP_STATEMENTS).map(([resource, actions]) => [resource, new Intl.ListFormat("en-US").format(actions)]),
    )
  })

  it("prints the Better Auth statements granted to admins", () => {
    renderInLocale("en-US", <RepositoryTable columns={["Resource", "Actions"]} name="adminStatements" />)

    expect(tableRows().slice(1)).toEqual(
      Object.entries(adminAc.statements).map(([resource, actions]) => [resource, new Intl.ListFormat("en-US").format(actions)]),
    )
  })

  it("prints the commit types with the emoji the commit hook adds", () => {
    renderInLocale("en-US", <RepositoryTable columns={["Type", "Emoji"]} name="commitTypes" />)

    expect(tableRows().slice(1)).toEqual(Object.entries(COMMIT_EMOJIS))
  })

  it("prints the regional price multipliers formatted for the page locale", () => {
    renderInLocale("pl-PL", <RepositoryTable columns={["Mnożnik", "Kraje"]} name="pppTiers" />)

    expect(tableRows().slice(1)).toEqual(
      PPP_TIERS.map(({ countries, multiplier }) => [
        new Intl.NumberFormat("pl-PL").format(multiplier),
        new Intl.ListFormat("pl-PL").format(countries),
      ]),
    )
  })
})
