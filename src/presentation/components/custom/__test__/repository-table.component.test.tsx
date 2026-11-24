import type { ReactNode } from "react"

import { STACK_CHOICES, STACK_EXTRAS } from "@saasyland/stack"
import { cleanup, render, screen, within } from "@testing-library/react"
import { type Messages, createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { LICENSE_TIERS } from "~/src/modules/license/license.constants"

import { CLI_TEMPLATE_SUPPORT } from "~/src/data/cli"
import { COURSE_PLATFORM_VALUES, TIER_FEATURES } from "~/src/data/marketing"
import { FEATURE_STATUS } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { tableRows } from "~/src/presentation/components/custom/__test__/fixtures/repository-table"
import { RepositoryTable } from "~/src/presentation/components/custom/repository-fact"

import { FLOW_AREA, FLOW_STATUS } from "~/e2e/data/flows"
import { FLOWS } from "~/scripts/check-flows"

const renderTranslated = (locale: SupportedLocale, children: ReactNode) =>
  render(
    <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
      {children}
    </IntlProvider>,
  )

const translator = (locale: SupportedLocale) => createTranslator<Messages>({ locale, messages: getTestMessages(locale) })

const statusOf = ([id]: readonly (string | null)[]) => FLOWS.find((flow) => flow.id === id)?.status

const groupedRows = (): (string | null)[][] =>
  screen.getAllByRole("table").flatMap((table) =>
    within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole("cell")
          .map((cell) => cell.textContent),
      ),
  )

const captionOf = (flowId: string): string | null | undefined =>
  screen
    .getByRole("row", { name: new RegExp(`^${flowId} `, "u") })
    .closest("table")
    ?.querySelector("caption")?.textContent

describe("the flow inventory", () => {
  it("counts every area's flows by status, formatted for the page locale", () => {
    const t = translator("pl-PL")
    renderTranslated(
      "pl-PL",
      <RepositoryTable columns={["Obszar", "Przepływy", "Pokryte", "Brakujące", "Do zbudowania"]} name="flowAreaTable" />,
    )

    expect(tableRows().slice(1)).toEqual(
      Object.values(FLOW_AREA).map((area) => {
        const flows = FLOWS.filter((flow) => flow.area === area)
        const count = (status: string): string => String(flows.filter((flow) => flow.status === status).length)

        return [
          t(`flow-areas.${area}`),
          String(flows.length),
          count(FLOW_STATUS.COVERED),
          count(FLOW_STATUS.MISSING),
          count(FLOW_STATUS.TO_BUILD),
        ]
      }),
    )
  })

  it("lists each covered flow under its area with the spec and title of every test that proves it, one test a line", () => {
    renderTranslated("en-US", <RepositoryTable columns={["Flow", "Outcome", "Tests"]} grouped name="coveredFlowTable" />)

    const rows = groupedRows()
    expect(rows).toHaveLength(FLOWS.filter(({ status }) => status === FLOW_STATUS.COVERED).length)
    expect(rows.map((row) => statusOf(row))).toEqual(rows.map(() => FLOW_STATUS.COVERED))
    expect(rows).toContainEqual([
      "admin-impersonate",
      expect.stringMatching(/^The admin impersonates a customer/u),
      "admin-users.spec.ts › admin impersonates a customer and stops impersonating",
    ])
    expect(captionOf("admin-impersonate")).toBe(translator("en-US")(`flow-areas.${FLOW_AREA.ADMIN_USERS}`))
  })

  it("lists each missing flow under its area with what is missing and the tests or journey step that do part of it", () => {
    renderTranslated(
      "en-US",
      <RepositoryTable columns={["Flow", "Outcome", "Missing", "Partly done by"]} grouped name="missingFlowTable" />,
    )

    const rows = groupedRows()
    expect(rows).toHaveLength(FLOWS.filter(({ status }) => status === FLOW_STATUS.MISSING).length)
    expect(rows.map((row) => statusOf(row))).toEqual(rows.map(() => FLOW_STATUS.MISSING))
    expect(rows).toContainEqual([
      "free-slot",
      expect.any(String),
      expect.stringMatching(/^Only the journey suite/u),
      "journey.spec.ts › free a CI slot on /app/license, and the refused machine takes it",
    ])
    expect(captionOf("free-slot")).toBe(translator("en-US")(`flow-areas.${FLOW_AREA.LICENCE}`))
  })

  it("lists each flow still to build under its area with the reason it cannot be tested yet", () => {
    renderTranslated("en-US", <RepositoryTable columns={["Flow", "Outcome", "Why"]} grouped name="toBuildFlowTable" />)

    const rows = groupedRows()
    expect(rows).toHaveLength(FLOWS.filter(({ status }) => status === FLOW_STATUS.TO_BUILD).length)
    expect(rows.map((row) => statusOf(row))).toEqual(rows.map(() => FLOW_STATUS.TO_BUILD))
  })

  it("sets an identifier in code that never wraps, a value of several words in code that wraps between them, and prose and tests as plain text", () => {
    renderTranslated("en-US", <RepositoryTable columns={["Flow", "Outcome", "Tests"]} grouped name="coveredFlowTable" />)

    const [id, outcome, tests] = within(screen.getByRole("row", { name: /^admin-impersonate /u })).getAllByRole("cell")
    expect(id?.querySelector("code")).toHaveClass("whitespace-nowrap")
    expect(outcome?.querySelector("code")).toBeNull()
    expect(tests?.querySelector("code")).toBeNull()
    cleanup()

    renderTranslated("en-US", <RepositoryTable columns={["English", "Polish", "Never"]} name="polishTerms" />)
    expect(screen.getByText("admin console")).not.toHaveClass("whitespace-nowrap")
  })

  it.each([
    { columns: ["Przepływ", "Czego brakuje"], name: "missingFlowGaps", status: FLOW_STATUS.MISSING },
    { columns: ["Przepływ", "Dlaczego"], name: "toBuildFlowGaps", status: FLOW_STATUS.TO_BUILD },
  ] as const)(
    "groups the $name of the roadmap by area, one captioned table per area with each flow's outcome and reason",
    ({ columns, name, status }) => {
      const t = translator("pl-PL")
      renderTranslated("pl-PL", <RepositoryTable columns={columns} grouped name={name} />)

      const flows = FLOWS.filter((flow) => flow.status === status)
      const areas = Object.values(FLOW_AREA).filter((area) => flows.some((flow) => flow.area === area))
      const tables = screen.getAllByRole("table")
      expect(tables.map((table) => table.querySelector("caption")?.textContent)).toEqual(areas.map((area) => t(`flow-areas.${area}`)))
      expect(
        tables.map((table) =>
          within(table)
            .getAllByRole("row")
            .slice(1)
            .map((row) => within(row).getAllByRole("cell").length),
        ),
      ).toEqual(areas.map((area) => flows.filter((flow) => flow.area === area).map(() => columns.length)))
      expect(
        within(tables[0] ?? document.body)
          .getAllByRole("columnheader")
          .map((header) => header.textContent),
      ).toEqual(columns)
    },
  )
})

describe("the roadmap tables", () => {
  it.each(["en-US", "pl-PL"] as const)(
    "lists every question and option of the stack in %s with whether the templates generate it",
    (locale) => {
      const t = translator(locale)
      renderTranslated(locale, <RepositoryTable columns={["Question", "Option", "Status"]} name="cliOptions" />)

      expect(tableRows().slice(1)).toEqual(
        STACK_CHOICES.flatMap((choice) => {
          const supported: readonly string[] = CLI_TEMPLATE_SUPPORT.choices[choice.id]

          return choice.options.map(({ id }) => [
            t(`stack.${choice.id}.label`),
            t(`stack.${choice.id}.options.${id}`),
            t(`components.custom.pricing.status.${supported.includes(id) ? FEATURE_STATUS.AVAILABLE : FEATURE_STATUS.ARRIVING}`),
          ])
        }),
      )
    },
  )

  it("marks the options the templates do not generate as arriving, and the others as available", () => {
    const t = translator("en-US")
    renderTranslated("en-US", <RepositoryTable columns={["Question", "Option", "Status"]} name="cliOptions" />)

    const rows = tableRows().slice(1)
    expect(rows).toContainEqual([
      t("stack.billing.label"),
      t("stack.billing.options.polar"),
      t("components.custom.pricing.status.arriving"),
    ])
    expect(rows).toContainEqual([
      t("stack.billing.label"),
      t("stack.billing.options.none"),
      t("components.custom.pricing.status.available"),
    ])
  })

  it("lists every extra with whether the templates generate it", () => {
    const t = translator("en-US")
    renderTranslated("en-US", <RepositoryTable columns={["Extra", "Status"]} name="cliExtras" />)

    const extras: readonly string[] = CLI_TEMPLATE_SUPPORT.extras
    expect(tableRows().slice(1)).toEqual(
      STACK_EXTRAS.map(({ id }) => [
        t(`stack.extras.options.${id}`),
        t(`components.custom.pricing.status.${extras.includes(id) ? FEATURE_STATUS.AVAILABLE : FEATURE_STATUS.ARRIVING}`),
      ]),
    )
  })

  it.each(["en-US", "pl-PL"] as const)(
    "lists every tier's features in %s, available first and then arriving, as its pricing card does",
    (locale) => {
      const t = translator(locale)
      renderTranslated(locale, <RepositoryTable columns={["Tier", "Feature", "Status"]} name="tierFeatures" />)

      const rows = tableRows().slice(1)
      expect(rows).toHaveLength(Object.values(TIER_FEATURES).flat().length)
      expect(rows.slice(0, TIER_FEATURES.core.length).map(([tier]) => tier)).toEqual(
        TIER_FEATURES.core.map(() => t("components.custom.pricing.tiers.core.name")),
      )
      expect(rows).toContainEqual([
        t("components.custom.pricing.tiers.agency.name"),
        t("components.custom.pricing.tiers.agency.features.seats", COURSE_PLATFORM_VALUES),
        t("components.custom.pricing.status.arriving"),
      ])
      expect(rows).toContainEqual([
        t("components.custom.pricing.tiers.core.name"),
        t("components.custom.pricing.tiers.core.features.tests", { coverageThreshold: REPOSITORY_FACTS.coverageThreshold }),
        t("components.custom.pricing.status.available"),
      ])
      const available = t("components.custom.pricing.status.available")
      const arriving = t("components.custom.pricing.status.arriving")
      for (const tier of LICENSE_TIERS) {
        const statuses = rows.filter(([name]) => name === t(`components.custom.pricing.tiers.${tier}.name`)).map((row) => row.at(-1))
        expect(statuses).toEqual([
          ...statuses.filter((status) => status === available),
          ...statuses.filter((status) => status === arriving),
        ])
      }
    },
  )
})
