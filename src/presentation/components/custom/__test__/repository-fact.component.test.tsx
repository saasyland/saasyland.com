import type { ReactNode } from "react"

import { API_BASE_PATH, API_ENDPOINT, API_ERROR_STATUS, API_LIMIT, RATE_LIMIT } from "@saasyland/stack/api"
import { render, screen, within } from "@testing-library/react"
import { adminAc } from "better-auth/plugins/admin/access"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"
import {
  BUNDLE_ARCHIVE_EXTENSION,
  BUNDLE_BINDING,
  BUNDLE_CONTENT_TYPE,
  BUNDLE_METADATA,
  BUNDLE_PATH_PREFIX,
  LICENSE_API_ENDPOINTS,
  LICENSE_API_RETRY_AFTER_SECONDS,
  REGIONAL_DISCOUNTS_REFRESH_AFTER_MS,
} from "~/src/modules/license/license.constants"
import { PPP_TIERS } from "~/src/modules/license/license.pricing"
import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { PLAYBACK_TTL_SECONDS } from "~/src/modules/video/video.playback"

import { APP_STATEMENTS } from "~/src/data/access"
import { OAUTH_PROVIDERS } from "~/src/data/auth"
import { CLI_LICENSE_COMMANDS, SCAFFOLD_TARGET, cliCommand } from "~/src/data/cli"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { LIVE_SITE_CHECK_RETRY_DELAYS_MS, LIVE_SITE_CHECK_RETRY_DELAY_MS } from "~/src/lib/deployment"
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "~/src/lib/duration"
import { STAR_COUNT_FETCH_TIMEOUT_MS, STAR_COUNT_REFRESH_AFTER_MS } from "~/src/lib/github"

import { RepositoryFact, RepositoryTable } from "~/src/presentation/components/custom/repository-fact"

import { TEST_ACCOUNTS } from "~/e2e/data/accounts"
import { TEST_LICENSE, TEST_LICENSED_ACCOUNT } from "~/e2e/data/licenses"
import { COMMIT_EMOJIS } from "~/scripts/commit-msg"
import { ROUTES } from "~/src/routes"

const renderInLocale = (locale: SupportedLocale, children: ReactNode) =>
  render(
    <IntlProvider locale={locale} messages={{}} timeZone="UTC">
      <div data-testid="fact">{children}</div>
    </IntlProvider>,
  )

const inUnit = (unit: string, value: number): string =>
  new Intl.NumberFormat("en-US", { style: "unit", unit, unitDisplay: "long" }).format(value)

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
      new Intl.NumberFormat(locale, { style: "unit", unit: "hour", unitDisplay: "long" }).format(PLAYBACK_TTL_SECONDS / SECONDS_PER_HOUR),
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

  it("prints the query and router cache times in minutes from the constants the router is created with", () => {
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
      [QUERY_STALE_TIME_MS, QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS].map((milliseconds) =>
        new Intl.NumberFormat("en-US", { style: "unit", unit: "minute", unitDisplay: "long" }).format(
          milliseconds / MILLISECONDS_PER_MINUTE,
        ),
      ),
    )
  })

  it("prints the cache lifetimes of the KV entries and the retries of the live site check in their units", () => {
    renderInLocale(
      "en-US",
      <ul>
        <li>
          <RepositoryFact name="starCountFetchTimeoutSeconds" unit="second" />
        </li>
        <li>
          <RepositoryFact name="starCountRefreshHours" unit="hour" />
        </li>
        <li>
          <RepositoryFact name="regionalDiscountsRefreshMinutes" unit="minute" />
        </li>
        <li>
          <RepositoryFact name="liveSiteCheckRetries" />
        </li>
        <li>
          <RepositoryFact name="liveSiteCheckRetrySeconds" unit="second" />
        </li>
      </ul>,
    )

    expect(listItems()).toEqual([
      inUnit("second", STAR_COUNT_FETCH_TIMEOUT_MS / MILLISECONDS_PER_SECOND),
      inUnit("hour", STAR_COUNT_REFRESH_AFTER_MS / MILLISECONDS_PER_HOUR),
      inUnit("minute", REGIONAL_DISCOUNTS_REFRESH_AFTER_MS / MILLISECONDS_PER_MINUTE),
      String(LIVE_SITE_CHECK_RETRY_DELAYS_MS.length),
      inUnit("second", LIVE_SITE_CHECK_RETRY_DELAY_MS / MILLISECONDS_PER_SECOND),
    ])
  })

  it("prints the CLI licence API's rate limits from the contract and its retry delay from the licence module", () => {
    renderInLocale(
      "en-US",
      <ul>
        <li>
          <RepositoryFact name="cliApiRequestsPerAddress" />
        </li>
        <li>
          <RepositoryFact name="cliApiRequestsPerLicenseKey" />
        </li>
        <li>
          <RepositoryFact name="cliApiRetryAfterSeconds" unit="second" />
        </li>
      </ul>,
    )

    expect(listItems()).toEqual([
      String(RATE_LIMIT.REQUESTS_PER_ADDRESS),
      String(RATE_LIMIT.REQUESTS_PER_LICENSE_KEY),
      new Intl.NumberFormat("en-US", { style: "unit", unit: "second", unitDisplay: "long" }).format(LICENSE_API_RETRY_AFTER_SECONDS),
    ])
  })

  it("prints the CLI commands of the licence page and the landing page's scaffold command from the CLI data", () => {
    renderInLocale(
      "en-US",
      <ul>
        <li>
          <RepositoryFact name="cliLicenseCommands" />
        </li>
        <li>
          <RepositoryFact name="scaffoldTarget" />
        </li>
      </ul>,
    )

    expect(listItems()).toEqual([
      new Intl.ListFormat("en-US").format(CLI_LICENSE_COMMANDS.map((command) => cliCommand(command))),
      SCAFFOLD_TARGET,
    ])
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

  it("prints every CLI licence API endpoint the site serves with its success statuses and error codes", () => {
    renderInLocale("en-US", <RepositoryTable columns={["Request", "Success", "Errors"]} name="cliApiEndpoints" />)

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Request", "Success", "Errors"])
    expect(tableRows().slice(1)).toEqual(
      LICENSE_API_ENDPOINTS.map((name) => API_ENDPOINT[name]).map(({ errors, method, route, statuses }) => [
        `${method} ${API_BASE_PATH}${route}`,
        new Intl.ListFormat("en-US").format(statuses.map(String)),
        new Intl.ListFormat("en-US").format(errors),
      ]),
    )
  })

  it("prints the HTTP status of every error those endpoints answer with, and only those", () => {
    renderInLocale("en-US", <RepositoryTable columns={["Code", "Status"]} name="cliApiErrors" />)

    const rows = tableRows().slice(1)
    expect(rows).toEqual(
      [...new Set(LICENSE_API_ENDPOINTS.flatMap((name) => API_ENDPOINT[name].errors))].map((code) => [
        code,
        String(API_ERROR_STATUS[code]),
      ]),
    )
  })

  it("prints every seeded account with its role and the tier of its licence", () => {
    renderInLocale("en-US", <RepositoryTable columns={["Email", "Role", "Licence"]} name="seededAccounts" />)

    expect(tableRows().slice(1)).toEqual([
      ...TEST_ACCOUNTS.map(({ email, role }) => [email, role, ""]),
      [TEST_LICENSED_ACCOUNT.email, TEST_LICENSED_ACCOUNT.role, TEST_LICENSE.tier],
    ])
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

describe("CLI template bundles", () => {
  it("prints the bundle URL's lifetime from the contract and the archive's path, key, media type and digest metadata from the licence module", () => {
    renderInLocale(
      "en-US",
      <ul>
        <li>
          <RepositoryFact name="cliApiBundleUrlTtlSeconds" unit="second" />
        </li>
        <li>
          <RepositoryFact name="cliBundleUrlPath" />
        </li>
        <li>
          <RepositoryFact name="cliBundleKey" />
        </li>
        <li>
          <RepositoryFact name="cliBundleContentType" />
        </li>
        <li>
          <RepositoryFact name="cliBundleDigestMetadata" />
        </li>
      </ul>,
    )

    expect(listItems()).toEqual([
      new Intl.NumberFormat("en-US", { style: "unit", unit: "second", unitDisplay: "long" }).format(API_LIMIT.BUNDLE_URL_TTL_SECONDS),
      `${BUNDLE_PATH_PREFIX}/<expiry>.<signature>/<version>${BUNDLE_ARCHIVE_EXTENSION}`,
      `<version>${BUNDLE_ARCHIVE_EXTENSION}`,
      BUNDLE_CONTENT_TYPE,
      BUNDLE_METADATA.SHA256,
    ])
  })

  it("prints the BUNDLES bucket of every environment from wrangler.jsonc", async () => {
    const { readBucketName } = await import("~/scripts/wrangler-config")
    renderInLocale("en-US", <RepositoryTable columns={["Environment", "Bucket"]} name="cliBundleBuckets" />)

    const rows = tableRows().slice(1)
    const expected = await Promise.all(
      rows.map(async ([environment = ""]) => [environment, await readBucketName({ binding: BUNDLE_BINDING, environment })]),
    )
    expect(new Set(rows.map(([environment]) => environment))).toEqual(new Set(Object.values(ENVIRONMENT)))
    expect(rows).toEqual(expected)
  })
})

describe("OAuth callbacks", () => {
  it("prints the callback paths and URLs of every OAuth provider under the auth routes' base path", () => {
    renderInLocale(
      "en-US",
      <ul>
        <li>
          <RepositoryFact name="oauthCallbackPath" />
        </li>
        <li>
          <RepositoryFact name="oauthCallbackPaths" />
        </li>
        <li>
          <RepositoryFact name="oauthCallbackUrls" />
        </li>
      </ul>,
    )

    const callback = `${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.CALLBACK}`
    const list = new Intl.ListFormat("en-US")
    expect(listItems()).toEqual([
      `${callback}/<provider>`,
      list.format(OAUTH_PROVIDERS.map(({ id }) => `${callback}/${id}`)),
      list.format(OAUTH_PROVIDERS.map(({ id }) => `https://<host>${callback}/${id}`)),
    ])
  })
})
