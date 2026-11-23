import type { JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { screen, waitFor, within } from "@testing-library/react"
import { type IntlError, IntlErrorCode } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { expect } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { DataGrid, type DataGridProps } from "~/src/presentation/components/custom/data-grid"

export { default as gridMessages } from "~/messages/en-US/components.custom.data-grid.json"

export interface Person {
  readonly age: number
  readonly id: string
  readonly joined: Date
  readonly name: string
  readonly role: string
  readonly team: string
}

export const ROLES = ["Analyst", "Architect", "Designer", "Engineer", "Lead", "Manager", "Researcher", "Tester", "Writer"] as const

export const TEAMS = [
  { label: "Compilers", value: "compilers" },
  { label: "Kernels", value: "kernels" },
] as const

export const PEOPLE: Person[] = [
  { age: 36, id: "ada", joined: new Date("2026-11-20T10:00:00.000Z"), name: "Ada", role: "Engineer", team: "compilers" },
  { age: 45, id: "grace", joined: new Date("2026-11-02T10:00:00.000Z"), name: "Grace", role: "Lead", team: "compilers" },
  { age: 41, id: "alan", joined: new Date("2025-06-01T10:00:00.000Z"), name: "Alan", role: "Researcher", team: "kernels" },
]

const helper = createColumnHelper<DataGridFeatures, Person>()

const JoinedCell = ({ getValue }: { readonly getValue: () => Date }): JSX.Element => <span>{getValue().toISOString().slice(0, 10)}</span>

export const PEOPLE_COLUMNS = helper.columns([
  helper.accessor("name", { header: "Name", meta: { filter: { kind: DATA_GRID_FILTER.TEXT }, pinned: DATA_GRID_PIN.START } }),
  helper.accessor("team", {
    header: "Team",
    meta: { export: ({ team }) => team.toUpperCase(), filter: { kind: DATA_GRID_FILTER.SELECT, options: TEAMS } },
  }),
  helper.accessor("role", {
    header: "Role",
    meta: { filter: { kind: DATA_GRID_FILTER.MULTI_SELECT, options: ROLES.map((role) => ({ label: role, value: role })) } },
  }),
  helper.accessor("age", { header: "Age", meta: { filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE } } }),
  helper.accessor("joined", { cell: JoinedCell, header: "Joined", meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE }, hidden: true } }),
  helper.display({ cell: () => "Open", header: "Profile", id: "profile", meta: { pinned: DATA_GRID_PIN.END } }),
])

export const SEARCH = { search: "Search people" } as const

export const messages = getTestMessages("en-US")

export const gridQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })

const expectOnlyTheMissingTimeZone = (error: IntlError): void => {
  expect(error.code).toBe(IntlErrorCode.ENVIRONMENT_FALLBACK)
}

const INTL_WITHOUT_TIME_ZONE = { onError: expectOnlyTheMissingTimeZone }

const INTL_WITH_TIME_ZONE = { timeZone: I18N.DEFAULT_TIMEZONE }

export const renderGrid = (
  props: Partial<DataGridProps<Person>> = {},
  {
    queryClient = gridQueryClient(),
    withoutTimeZone = false,
  }: { readonly queryClient?: QueryClient; readonly withoutTimeZone?: boolean } = {},
) =>
  renderWithRouter(
    <IntlProvider
      formats={I18N.FORMATS}
      locale="en-US"
      messages={messages}
      {...(withoutTimeZone ? INTL_WITHOUT_TIME_ZONE : INTL_WITH_TIME_ZONE)}
    >
      <DataGrid columns={PEOPLE_COLUMNS} data={PEOPLE} id={crypto.randomUUID()} label="People" {...props} />
    </IntlProvider>,
    { queryClient },
  )

export const HEADER_ROWS = 1

const EVEN_BEHIND_A_POPOVER = { hidden: true } as const

export const bodyRows = (): HTMLElement[] =>
  within(screen.getByRole("table", { ...EVEN_BEHIND_A_POPOVER, name: "People" }))
    .getAllByRole("row", EVEN_BEHIND_A_POPOVER)
    .slice(HEADER_ROWS)

export const headerNames = (): string[] => screen.getAllByRole("columnheader", EVEN_BEHIND_A_POPOVER).map((header) => header.textContent)

export const columnTexts = (name: string): string[] => {
  const index = headerNames().indexOf(name)
  return bodyRows().map((row) => within(row).getAllByRole("cell", EVEN_BEHIND_A_POPOVER)[index]?.textContent ?? "")
}

export const closePopover = async (user: { readonly keyboard: (keys: string) => Promise<void> }): Promise<void> => {
  await user.keyboard("{Escape}")
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
}
