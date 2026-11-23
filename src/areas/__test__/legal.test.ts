import { expect, it } from "vite-plus/test"

import { LEGAL_BROWSER } from "~/src/areas/legal"

import { SignUpConsentPending } from "~/src/presentation/components/custom/legal-pending"

it("adds the consent line under the sign-up form, with its skeleton", () => {
  expect(LEGAL_BROWSER.signUpNotices).toStrictEqual([expect.objectContaining({ Pending: SignUpConsentPending, key: "consent" })])
})

it("needs no data for the account deletion notice about the records that are kept", async () => {
  await expect(Promise.all(LEGAL_BROWSER.accountDeletion.map(({ load }) => load()))).resolves.toStrictEqual([undefined])
})
