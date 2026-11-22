import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Copy, Download } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { Button, LinkButton } from "~/src/presentation/components/shadcn/button"

import { APP_NAME, APP_SLUG } from "~/src/presentation/branding"

const FILE_NAME = `${APP_SLUG}-backup-codes.txt`

interface BackupCodesProps {
  readonly backupCodes: readonly string[]
  readonly onDone: () => void
}

export const BackupCodes = ({ backupCodes, onDone }: BackupCodesProps): JSX.Element => {
  const t = useTranslations("auth.security.twoFactor")

  const email = useSuspenseQuery(getCurrentSessionQuery).data?.user.email ?? ""

  const file = [t("backupCodesFile", { appName: APP_NAME, email }), "", ...backupCodes, ""].join("\n")

  const copy = (): void => {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(
      () => {
        toast.success(t("codesCopied"))
      },
      () => {
        toast.error(t("copyFailed"))
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/40 p-4 font-mono text-sm text-foreground">
        {backupCodes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button onPress={copy} size="sm" variant="outline">
          <Copy aria-hidden />
          {t("copyCodes")}
        </Button>
        <LinkButton download={FILE_NAME} href={`data:text/plain;charset=utf-8,${encodeURIComponent(file)}`} size="sm" variant="outline">
          <Download aria-hidden />
          {t("downloadCodes")}
        </LinkButton>
      </div>
      <Button onPress={onDone}>{t("saved")}</Button>
    </div>
  )
}
