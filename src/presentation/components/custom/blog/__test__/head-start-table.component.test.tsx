import { cleanup, render, screen, within } from "@testing-library/react"
import { IntlProvider, createTranslator } from "use-intl"
import { afterEach, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { HEAD_START_HIGH_HOURS, HEAD_START_LOW_HOURS, HEAD_START_ROWS } from "~/src/data/head-start"

import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

import { HeadStartTable } from "~/src/presentation/components/custom/blog/head-start-table"

import blogMessages from "~/messages/en-US/pages.blog.json"

afterEach(cleanup)

const t = createTranslator({ locale: "en-US", messages: blogMessages, namespace: "headStart" })

it("prints every row of the head start with its layers and hours, then the totals", () => {
  render(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <HeadStartTable />
    </IntlProvider>,
  )

  const rows = screen.getAllByRole("row")
  expect(rows).toHaveLength(HEAD_START_ROWS.length + 2)
  expect(within(rows[0] ?? document.body).getByText(blogMessages.headStart.columns.work)).toBeVisible()
  for (const [index, { high, id, layers, low }] of HEAD_START_ROWS.entries()) {
    const row = within(rows[index + 1] ?? document.body)
    expect(row.getByText(t(`rows.${id}`, { coverageThreshold: REPOSITORY_FACTS.coverageThreshold }))).toBeVisible()
    for (const layer of layers) {
      expect(row.getByText(layer)).toBeVisible()
    }
    expect(row.getByText(`${String(low)} to ${String(high)}`)).toBeVisible()
  }
  expect(
    within(rows.at(-1) ?? document.body).getByText(`${String(HEAD_START_LOW_HOURS)} to ${String(HEAD_START_HIGH_HOURS)}`),
  ).toBeVisible()
})
