import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"

import { REFUND_TERMS } from "~/src/data/refunds"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

const WITHDRAWAL_DETAILS = ["name", "email", "reference", "channel", "eligibility", "acknowledgement"] as const

type WithdrawalDetail = (typeof WITHDRAWAL_DETAILS)[number]

const WithdrawalStatement = ({ row }: { readonly row: Withdrawal["userRow"] }): JSX.Element => {
  const t = useTranslations()

  const dateTime = (value: Date): string => t("auth.dates.dateTime", { value })

  const acknowledgement = (sentAt: Withdrawal["userRow"]["acknowledgedAt"]): string => {
    if (sentAt === null) {
      return t("pages.admin.users.license.withdrawals.acknowledgement.notSent")
    }

    return t("pages.admin.users.license.withdrawals.acknowledgement.sent", { date: dateTime(sentAt) })
  }

  const values: Record<WithdrawalDetail, string> = {
    acknowledgement: acknowledgement(row.acknowledgedAt),
    channel: t(`pages.admin.users.license.withdrawals.channel.${row.channel}`),
    eligibility: t(`pages.admin.users.license.withdrawals.eligibility.${row.eligibility}`, { days: REFUND_TERMS.WITHDRAWAL_DAYS }),
    email: row.email,
    name: row.name,
    reference: row.reference,
  }

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <p className="text-sm font-medium text-foreground">
        {t("pages.admin.users.license.withdrawals.received", { date: dateTime(row.createdAt) })}
      </p>
      <dl className="flex flex-col gap-1.5 text-sm">
        {WITHDRAWAL_DETAILS.map((detail) => (
          <div className="flex flex-col gap-0.5" key={detail}>
            <dt className="text-muted-foreground">{t(`pages.admin.users.license.withdrawals.details.${detail}`)}</dt>
            <dd className="wrap-break-word text-foreground">{values[detail]}</dd>
          </div>
        ))}
      </dl>
    </li>
  )
}

export const UserWithdrawals = ({ userId }: { readonly userId: string }): JSX.Element => {
  const t = useTranslations("pages.admin.users.license.withdrawals")

  const { rows } = useSuspenseQuery(userWithdrawalsQuery({ userId })).data

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <WithdrawalStatement key={row.id} row={row} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
