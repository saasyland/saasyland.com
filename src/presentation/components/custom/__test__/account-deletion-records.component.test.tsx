import { screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { AccountDeletionRecords } from "~/src/presentation/components/custom/account-deletion-records"

import recordsMessages from "~/messages/en-US/components.custom.account-deletion-records.json"
import * as ROUTES from "~/src/routes"

const PRIVACY_TAG = /<privacy>(?<link>.*)<\/privacy>/u

it("says which records the law keeps after deletion and links the privacy policy", () => {
  renderWithRouter(
    <IntlProvider locale="en-US" messages={{ components: { custom: { "account-deletion-records": recordsMessages } } }}>
      <ul>
        <AccountDeletionRecords />
      </ul>
    </IntlProvider>,
  )
  const link = PRIVACY_TAG.exec(recordsMessages.kept)?.groups?.["link"] ?? ""

  expect(screen.getByRole("listitem")).toHaveTextContent(recordsMessages.kept.replace(PRIVACY_TAG, link))
  expect(screen.getByRole("link", { name: link })).toHaveAttribute("href", ROUTES.PRIVACY)
})
