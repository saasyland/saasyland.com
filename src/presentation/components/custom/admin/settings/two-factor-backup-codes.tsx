import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

export const TwoFactorBackupCodes = ({
  backupCodes,
  onDone,
}: {
  readonly backupCodes: readonly string[]
  readonly onDone: () => void
}): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.twoFactor")

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("backupCodesDescription")}</p>
      <ul className="grid grid-cols-2 gap-2 rounded-md bg-muted/60 p-3 font-mono text-xs text-foreground">
        {backupCodes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button onPress={onDone} type="button">
        {t("done")}
      </Button>
    </div>
  )
}
