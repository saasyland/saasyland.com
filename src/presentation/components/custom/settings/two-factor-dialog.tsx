import { type JSX, useState } from "react"

import { useTranslations } from "use-intl/react"

import { TWO_FACTOR_INTENT, type TwoFactorIntent } from "~/src/data/auth"

import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"

import { BackupCodes } from "~/src/presentation/components/custom/settings/backup-codes"
import { TwoFactorPasswordStep } from "~/src/presentation/components/custom/settings/two-factor-password-step"
import { TwoFactorVerifyStep } from "~/src/presentation/components/custom/settings/two-factor-verify-step"

import { APP_NAME } from "~/src/presentation/branding"

type TwoFactorStep =
  | { readonly step: "password" }
  | { readonly backupCodes: readonly string[]; readonly step: "verify"; readonly totpUri: string }
  | { readonly backupCodes: readonly string[]; readonly step: "codes" }

const PASSWORD_STEP = { step: "password" } as const

interface TwoFactorDialogProps {
  readonly intent: TwoFactorIntent | undefined
  readonly onClose: () => void
}

export const TwoFactorDialog = ({ intent, onClose }: TwoFactorDialogProps): JSX.Element => {
  const t = useTranslations("auth.security.twoFactor")

  const [dialog, setDialog] = useState<TwoFactorStep>(PASSWORD_STEP)

  const close = (): void => {
    setDialog(PASSWORD_STEP)
    onClose()
  }

  const isPasswordStep = dialog.step === "password"
  const heading = intent ?? TWO_FACTOR_INTENT.ENABLE

  return (
    <Dialog className="sm:max-w-md" isDismissable={dialog.step !== "codes"} isOpen={intent !== undefined} onOpenChange={close}>
      <DialogHeader>
        <DialogTitle>{dialog.step === "codes" ? t("backupCodesTitle") : t(`titles.${heading}`)}</DialogTitle>
        <DialogDescription>
          {isPasswordStep && t(`descriptions.${heading}`, { appName: APP_NAME })}
          {dialog.step === "verify" && t("descriptions.verify", { appName: APP_NAME })}
          {dialog.step === "codes" && t("backupCodesDescription")}
        </DialogDescription>
      </DialogHeader>

      {isPasswordStep && intent !== undefined && (
        <TwoFactorPasswordStep
          intent={intent}
          onBackupCodes={(backupCodes) => {
            setDialog({ backupCodes, step: "codes" })
          }}
          onDisabled={close}
          onEnabled={(totpUri, backupCodes) => {
            setDialog({ backupCodes, step: "verify", totpUri })
          }}
        />
      )}
      {dialog.step === "verify" && (
        <TwoFactorVerifyStep
          onVerified={() => {
            setDialog({ backupCodes: dialog.backupCodes, step: "codes" })
          }}
          totpUri={dialog.totpUri}
        />
      )}
      {dialog.step === "codes" && <BackupCodes backupCodes={dialog.backupCodes} onDone={close} />}
    </Dialog>
  )
}
