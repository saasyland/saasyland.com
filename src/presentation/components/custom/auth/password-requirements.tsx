import type { JSX } from "react"

import { Check, Minus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"

import { cn } from "~/src/lib/cn"

export const PasswordRequirements = ({ id, password }: Readonly<{ id: string; password: string }>): JSX.Element => {
  const t = useTranslations("auth.validations")
  const isLongEnough = password.length >= PASSWORD_MIN_LENGTH

  return (
    <div className="flex flex-col gap-2" id={id}>
      <ul aria-label={t("requirementsListLabel")} className="flex list-none flex-col gap-2">
        <li className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors duration-200 ease-exp",
              {
                "border-foreground bg-foreground text-background": isLongEnough,
                "border-muted-foreground text-muted-foreground": !isLongEnough,
              },
            )}
          >
            {isLongEnough && <Check className="size-3" strokeWidth={2} />}
            {!isLongEnough && <Minus className="size-3" strokeWidth={2} />}
          </span>
          <span className="text-body-sm text-foreground">{t("atLeastMinCharactersLong", { min: PASSWORD_MIN_LENGTH })}</span>
          <span className="sr-only">{t(isLongEnough ? "requirementMet" : "requirementNotMet")}</span>
        </li>
      </ul>
      <p className="text-body-sm text-pretty text-muted-foreground">{t("breachCheck")}</p>
    </div>
  )
}
