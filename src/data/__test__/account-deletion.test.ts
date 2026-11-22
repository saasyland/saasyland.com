import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { ACCOUNT_DELETION_NOTICES, type AccountDeletionNotice } from "~/src/data/account-deletion"
import * as AREA_ACCOUNT_DELETION from "~/src/data/account-deletion.entries"
import { LEGAL_ACCOUNT_DELETION } from "~/src/data/legal.account-deletion"
import { LICENSE_ACCOUNT_DELETION } from "~/src/data/license.account-deletion"

const AREAS: readonly (readonly AccountDeletionNotice[])[] = Object.values(AREA_ACCOUNT_DELETION)

const loadAll = (notices: readonly AccountDeletionNotice[], queryClient: QueryClient) =>
  Promise.all(notices.map(({ load }) => load({ queryClient })))

describe("account deletion notices", () => {
  it("joins the notices of every area once, each with its own key", () => {
    const declared = AREAS.flat()

    expect(ACCOUNT_DELETION_NOTICES).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("loads the licence that the licence area's notice reads", async () => {
    const queryClient = new QueryClient()
    vi.spyOn(currentLicenseQuery, "queryFn").mockResolvedValue({ license: undefined })

    await loadAll(LICENSE_ACCOUNT_DELETION, queryClient)

    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toStrictEqual({ license: undefined })
  })

  it("needs no data for the notice about the records that are kept", async () => {
    await expect(loadAll(LEGAL_ACCOUNT_DELETION, new QueryClient())).resolves.toStrictEqual([undefined])
  })
})
