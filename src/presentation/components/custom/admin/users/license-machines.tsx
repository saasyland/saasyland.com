import { type JSX, useId } from "react"

import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { Dialog } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { LICENSE_MACHINES } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Popover, PopoverTitle, PopoverTrigger } from "~/src/presentation/components/shadcn/popover"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

type ListedMachines = Extract<License["userMachines"], { activations: unknown }>

const MachineCount = ({ machines }: { readonly machines: ListedMachines }): string => {
  const t = useTranslations("pages.admin.users.license.activations")
  const used = machines.activations.length

  if (machines.limit === null) {
    return t("unlimited", { used })
  }

  return t("count", { limit: machines.limit, used })
}

const MachineList = ({ machines }: { readonly machines: ListedMachines }): JSX.Element => {
  const t = useTranslations()

  if (machines.activations.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("pages.admin.users.license.activations.none")}</p>
  }

  const platform = (machine: License["machine"]): string => {
    if (machine.platform === undefined) {
      return t("pages.admin.users.license.activations.unknownPlatform")
    }

    return t(`pages.admin.users.license.activations.platforms.${machine.platform}`)
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {machines.activations.map((machine) => (
        <li className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0" key={machine.id}>
          <span className="text-sm font-medium wrap-anywhere text-foreground">{machine.label}</span>
          <span className="flex flex-wrap gap-x-3 text-spec text-muted-foreground">
            <span>{platform(machine)}</span>
            <span>
              {t("pages.admin.users.license.activations.activated", { date: t("common.dateTime", { value: machine.createdAt }) })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

const MachinesUnavailable = (): JSX.Element => {
  const t = useTranslations("pages.admin.users.license.activations.unavailable")

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm" role="status">
      <p className="font-medium text-foreground">{t("title")}</p>
      <p className="mt-1 text-muted-foreground">{t("description")}</p>
    </div>
  )
}

export const LicenseMachines = ({ userId }: { readonly userId: string }): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.users.license.activations")
  const titleId = useId()

  const { machines } = useSuspenseQuery(userActivationsQuery({ userIds: [userId] })).data
  const owned = machines.find((entry) => entry.userId === userId)

  if (owned === undefined) {
    return
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="text-sm font-medium text-foreground" id={titleId}>
        {t("title")}
      </h3>
      {owned.state === LICENSE_MACHINES.NO_KEY && <p className="text-sm text-muted-foreground">{t("noKey")}</p>}
      {owned.state === LICENSE_MACHINES.UNAVAILABLE && <MachinesUnavailable />}
      {owned.state === LICENSE_MACHINES.LISTED && (
        <>
          <p className="text-sm text-muted-foreground">
            <MachineCount machines={owned} />
          </p>
          <MachineList machines={owned} />
        </>
      )}
    </section>
  )
}

export const CustomerMachines = ({ accounts, userId }: { readonly accounts: readonly string[]; readonly userId: string }): JSX.Element => {
  const t = useTranslations("pages.admin.users.license.activations")

  const { data, isPending } = useQuery(userActivationsQuery({ userIds: [...accounts] }))

  if (isPending) {
    return <Skeleton className="h-lh w-20 scale-y-70 text-sm" />
  }

  const owned = data?.machines.find((entry) => entry.userId === userId)

  if (data === undefined || owned?.state === LICENSE_MACHINES.UNAVAILABLE) {
    return <span className="text-sm text-muted-foreground">{t("polarUnavailable")}</span>
  }

  if (owned === undefined) {
    return <span className="text-sm text-muted-foreground">{t("noLicense")}</span>
  }

  if (owned.state === LICENSE_MACHINES.NO_KEY) {
    return <span className="text-sm text-muted-foreground">{t("noKeyShort")}</span>
  }

  return (
    <PopoverTrigger>
      <Button className="-ml-2.5 font-normal" size="sm" variant="ghost">
        <MachineCount machines={owned} />
        <ChevronDown aria-hidden data-icon="inline-end" />
      </Button>
      <Popover placement="bottom start">
        <Dialog className="flex flex-col gap-2.5 outline-hidden">
          <PopoverTitle className="text-sm" slot="title">
            {t("title")}
          </PopoverTitle>
          <MachineList machines={owned} />
        </Dialog>
      </Popover>
    </PopoverTrigger>
  )
}
