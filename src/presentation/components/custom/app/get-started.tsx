import { type JSX, type ReactNode, useId, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CircleCheck } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { licenseSetupQuery } from "~/src/modules/license/use-cases/get-current-license"
import { licenseKeySetupQuery } from "~/src/modules/license/use-cases/get-current-license-key"

import { useEmailVerification } from "~/src/hooks/use-email-verification"

import { CLI_COMMAND, CLI_SETUP_LINES } from "~/src/data/cli"
import { REFUND_TERMS } from "~/src/data/refunds"

import { cn } from "~/src/lib/cn"

import { Progress, ProgressLabel } from "~/src/presentation/components/shadcn/progress"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ADDRESS_TAGS } from "~/src/presentation/components/custom/address-tags"
import { CommandLine } from "~/src/presentation/components/custom/app/command-line"

import * as ROUTES from "~/src/routes"

const STEP_NUMBER_BASE = 1

const REFUND_TAGS = {
  days: REFUND_TERMS.WITHDRAWAL_DAYS,
  refunds: (chunks: ReactNode) => (
    <Link
      className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      to={ROUTES.REFUNDS}
    >
      {chunks}
    </Link>
  ),
}

interface StepProps {
  readonly children?: ReactNode
  readonly done: boolean
  readonly number?: number
  readonly title: string
}

const Step = ({ children, done, number, title }: StepProps): JSX.Element => {
  const t = useTranslations("pages.license.setup")

  return (
    <li className="flex gap-4 py-4">
      <span
        aria-hidden
        className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-label tabular-nums", {
          "border border-border text-muted-foreground": !done,
          "text-ring": done,
        })}
      >
        {done && <CircleCheck className="size-6" strokeWidth={1.75} />}
        {!done && number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <p className={cn("text-body-sm font-medium", { "text-foreground": !done, "text-muted-foreground": done })}>
          {title}
          <span className="sr-only">
            {" "}
            {done && t("done")}
            {!done && t("todo")}
          </span>
        </p>
        {children}
      </div>
    </li>
  )
}

const KeyToCopy = ({ onCopy }: Readonly<{ onCopy: () => void }>): JSX.Element => {
  const t = useTranslations()

  const { key } = useSuspenseQuery(licenseKeySetupQuery).data
  const { unconfirmedEmail } = useEmailVerification()

  if (unconfirmedEmail !== undefined) {
    return (
      <p className="text-body-sm text-pretty text-muted-foreground">
        {t.rich("pages.license.keyAwaitsConfirmation", { ...ADDRESS_TAGS, email: unconfirmedEmail })}
      </p>
    )
  }

  if (typeof key !== "string") {
    return (
      <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
        <Spinner />
        {t("pages.license.setup.steps.key.pending")}
      </p>
    )
  }

  return <CommandLine copyLabel={t("pages.license.copy.key")} isCommand={false} onCopy={onCopy} value={key} />
}

export const GetStarted = (): JSX.Element | undefined => {
  const t = useTranslations()
  const headingId = useId()
  const [hasCopiedKey, setHasCopiedKey] = useState(false)

  const { license } = useSuspenseQuery(licenseSetupQuery).data

  if (license?.status !== LICENSE_STATUS.ACTIVE) {
    return
  }

  const ran = { [CLI_COMMAND.ACTIVATE]: license.activatedAt !== null, [CLI_COMMAND.INIT]: license.deliveredAt !== null }
  const keyDone = hasCopiedKey || ran[CLI_COMMAND.ACTIVATE]
  const steps = [true, keyDone, ...CLI_SETUP_LINES.map(({ id }) => ran[id])]
  const done = steps.filter(Boolean).length

  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-border bg-card p-6 md:p-8">
      <h2 className="text-title text-balance text-foreground" id={headingId}>
        {t("pages.license.setup.title")}
      </h2>
      <p className="mt-1.5 max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t("pages.license.setup.description")}</p>
      <Progress className="mt-5 max-w-md **:data-[slot=progress-indicator]:bg-ring" maxValue={steps.length} value={done}>
        <ProgressLabel className="text-spec text-muted-foreground">
          {t("pages.license.setup.progress", { done, total: steps.length })}
        </ProgressLabel>
      </Progress>
      <ol className="mt-5 divide-y divide-border border-y border-border">
        <Step done title={t("pages.license.setup.steps.purchase", { tier: t(`components.custom.pricing.tiers.${license.tier}.name`) })} />
        <Step done={keyDone} number={STEP_NUMBER_BASE} title={t("pages.license.setup.steps.key.title")}>
          <KeyToCopy
            onCopy={() => {
              setHasCopiedKey(true)
            }}
          />
        </Step>
        {CLI_SETUP_LINES.map(({ command, id }, index) => (
          <Step done={ran[id]} key={id} number={STEP_NUMBER_BASE + index + 1} title={t(`pages.license.setup.steps.${id}.title`)}>
            <CommandLine copyLabel={t("pages.license.copy.command", { command })} isCommand value={command} />
            <p className="text-body-sm text-pretty text-muted-foreground">{t.rich(`pages.license.setup.steps.${id}.body`, REFUND_TAGS)}</p>
          </Step>
        ))}
      </ol>
    </section>
  )
}
