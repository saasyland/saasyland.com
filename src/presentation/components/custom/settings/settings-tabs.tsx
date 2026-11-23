import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { SETTINGS_TABS } from "~/src/data/auth"

import { TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { ConnectedAccountsCard } from "~/src/presentation/components/custom/settings/connected-accounts-card"
import { PasswordCard } from "~/src/presentation/components/custom/settings/password-card"
import { SessionsCard } from "~/src/presentation/components/custom/settings/sessions-card"
import { TwoFactorCard } from "~/src/presentation/components/custom/settings/two-factor-card"

import type { ROUTES } from "~/src/routes"

export const SettingsTabs = ({ to }: { readonly to: typeof ROUTES.ADMIN_SETTINGS | typeof ROUTES.APP_SETTINGS }): JSX.Element => {
  const t = useTranslations("auth.security.tabs")

  return (
    <TabsList className="no-scrollbar justify-start gap-6 overflow-x-auto" variant="line">
      {SETTINGS_TABS.map((id) => (
        <TabsTrigger className="flex-none px-0 text-sm" href={`${to}?tab=${id}`} id={id} key={id}>
          {t(id)}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

export const SecurityCards = (): JSX.Element => (
  <>
    <PasswordCard />
    <TwoFactorCard />
    <ConnectedAccountsCard />
    <SessionsCard />
  </>
)
