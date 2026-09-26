import { type JSX, useState } from "react"

import { useIsMutating, useSuspenseQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { TWO_FACTOR_MUTATION_KEYS } from "~/src/modules/two-factor/two-factor.constants"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"

import { TwoFactorBackupCodes } from "~/src/presentation/components/custom/admin/settings/two-factor-backup-codes"
import { TwoFactorPasswordStep } from "~/src/presentation/components/custom/admin/settings/two-factor-password-step"
import { TwoFactorVerifyStep } from "~/src/presentation/components/custom/admin/settings/two-factor-verify-step"

type TwoFactorDialogState =
  | { readonly step: "disable" | "password" }
  | { readonly backupCodes: readonly string[]; readonly step: "verify"; readonly totpUri: string }
  | { readonly backupCodes: readonly string[]; readonly step: "confirm" }

export const TwoFactorDialog = (): JSX.Element => {
  const [dialog, setDialog] = useState<TwoFactorDialogState>()

  const t = useTranslations("pages.admin.settings.security.twoFactor")

  const isEnabled = useSuspenseQuery(getCurrentSessionQuery).data?.user.twoFactorEnabled ?? false
  const isPending = useIsMutating({ mutationKey: TWO_FACTOR_MUTATION_KEYS.ALL }) > 0

  const closeDialog = () => {
    setDialog(undefined)
  }

  return (
    <>
      <Button
        className="h-8 shrink-0 px-4 text-xs"
        isDisabled={isPending}
        onPress={() => {
          setDialog({ step: isEnabled ? "disable" : "password" })
        }}
        size="sm"
        variant="outline"
      >
        {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {isEnabled ? t("disable") : t("enable")}
      </Button>

      <Dialog className="max-w-md" isOpen={dialog !== undefined} onOpenChange={closeDialog}>
        <DialogHeader>
          <DialogTitle>{dialog?.step === "disable" ? t("disableDialogTitle") : t("dialogTitle")}</DialogTitle>
          <DialogDescription>{dialog?.step === "disable" ? t("disableDialogDescription") : t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        {(dialog?.step === "password" || dialog?.step === "disable") && (
          <TwoFactorPasswordStep
            isDisabling={dialog.step === "disable"}
            onDisabled={() => {
              closeDialog()
              toast.success(t("disabledSuccess"))
            }}
            onEnabled={(totpUri, backupCodes) => {
              setDialog({ backupCodes, step: "verify", totpUri })
            }}
          />
        )}
        {dialog?.step === "verify" && (
          <TwoFactorVerifyStep
            onVerified={() => {
              setDialog({ backupCodes: dialog.backupCodes, step: "confirm" })
            }}
            totpUri={dialog.totpUri}
          />
        )}
        {dialog?.step === "confirm" && <TwoFactorBackupCodes backupCodes={dialog.backupCodes} onDone={closeDialog} />}
      </Dialog>
    </>
  )
}
