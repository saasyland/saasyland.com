import { type JSX, Suspense } from "react"

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { refundEligibilityValues } from "~/src/modules/license/license.refunds"
import { withdrawalContractQuery } from "~/src/modules/withdrawal/use-cases/get-withdrawal-contract"
import { WITHDRAWAL_QUERY_KEYS } from "~/src/modules/withdrawal/withdrawal.constants"

import { REFUND_TERMS } from "~/src/data/refunds"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"

import { WithdrawalCardPending } from "~/src/presentation/components/custom/app/license-pending"
import { WithdrawalForm } from "~/src/presentation/components/custom/withdrawal-form"

const ContractWithdrawal = (): JSX.Element | undefined => {
  const t = useTranslations()
  const queryClient = useQueryClient()

  const { contract } = useSuspenseQuery(withdrawalContractQuery).data

  if (contract === undefined) {
    return undefined
  }

  const dateTime = (value: Date): string => t("common.dateTime", { value })
  const { date, ...use } = refundEligibilityValues(contract.eligibility)
  const description = t("pages.withdrawal.card.contract", {
    date: dateTime(contract.purchasedAt),
    reference: contract.reference,
    tier: t(`components.custom.pricing.tiers.${contract.tier}.name`),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("pages.withdrawal.card.title")}</h2>
        </CardTitle>
        <CardDescription className="wrap-break-word">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="text-sm text-pretty text-muted-foreground">
          {t(`pages.withdrawal.card.terms.${contract.eligibility.kind}`, {
            ...use,
            date: dateTime(date),
            days: REFUND_TERMS.WITHDRAWAL_DAYS,
          })}
        </p>
        {contract.receivedAt !== undefined && (
          <p className="text-sm font-medium text-foreground" role="status">
            {t("pages.withdrawal.card.received", { submittedAt: dateTime(contract.receivedAt) })}
          </p>
        )}
        <DialogTrigger>
          <Button size="sm" variant="outline">
            {t("pages.withdrawal.card.open")}
          </Button>
          <Dialog className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("pages.withdrawal.form.title")}</DialogTitle>
              <DialogDescription className="wrap-break-word">{description}</DialogDescription>
            </DialogHeader>
            <WithdrawalForm
              defaultValues={{ email: contract.email, name: contract.name, reference: contract.reference }}
              onSubmitted={() => queryClient.invalidateQueries({ queryKey: WITHDRAWAL_QUERY_KEYS.ALL })}
            />
          </Dialog>
        </DialogTrigger>
      </CardContent>
    </Card>
  )
}

export const WithdrawalCard = (): JSX.Element => (
  <Suspense fallback={<WithdrawalCardPending />}>
    <ContractWithdrawal />
  </Suspense>
)
