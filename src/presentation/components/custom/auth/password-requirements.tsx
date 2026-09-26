import type { JSX } from "react"

import { Check, Minus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PASSWORD_MIN_LENGTH, getPasswordRuleState } from "~/src/integrations/better-auth/auth.constraints"

import { PASSWORD_RULES } from "~/src/data/auth"

import { cn } from "~/src/lib/cn"

export const PasswordRequirements = ({
  confirmPassword,
  password,
}: Readonly<{ confirmPassword: string; password: string }>): JSX.Element => {
  const t = useTranslations("auth.validations")
  const { hasSpecialChar, hasUppercase, isMinLength } = getPasswordRuleState(password)

  const satisfiedRules = {
    atLeastMinCharactersLong: isMinLength,
    atLeastOneSpecialCharacter: hasSpecialChar,
    atLeastOneUppercase: hasUppercase,
    passwordsMatch: password.length > 0 && password === confirmPassword,
  }

  return (
    <ul aria-label={t("requirementsListLabel")} className="flex list-none flex-col gap-2">
      {PASSWORD_RULES.map((id) => {
        const satisfied = satisfiedRules[id]

        return (
          <li className="flex items-start gap-2.5" key={id}>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors duration-200 ease-exp",
                {
                  "border-foreground bg-foreground text-background": satisfied,
                  "border-muted-foreground text-muted-foreground": !satisfied,
                },
              )}
            >
              {satisfied && <Check className="size-3" strokeWidth={2} />}
              {!satisfied && <Minus className="size-3" strokeWidth={2} />}
            </span>
            <span className="text-body-sm text-foreground">{t(id, { min: PASSWORD_MIN_LENGTH })}</span>
            <span className="sr-only">{t(satisfied ? "requirementMet" : "requirementNotMet")}</span>
          </li>
        )
      })}
    </ul>
  )
}
