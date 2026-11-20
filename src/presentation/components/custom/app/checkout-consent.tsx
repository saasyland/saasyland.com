import { type JSX, type ReactNode, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { LICENSE_QUERY_KEYS, type LicenseTier } from "~/src/modules/license/license.constants"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { REFUND_TERMS } from "~/src/data/refunds"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import { DialogClose, DialogFooter } from "~/src/presentation/components/shadcn/dialog"
import { Field, FieldContent, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const LINK_CLASSNAME = "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"

const LEGAL_TAGS = {
  licence: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.LICENCE}>
      {chunks}
    </Link>
  ),
  refunds: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.REFUNDS}>
      {chunks}
    </Link>
  ),
  terms: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.TERMS}>
      {chunks}
    </Link>
  ),
}

const consentSchema = licenseZodSchemas.startCheckout.pick({ withdrawalConsent: true })

interface CheckoutConsentProps {
  readonly onClose: () => void
  readonly tier: LicenseTier
}

export const CheckoutConsent = ({ onClose, tier }: CheckoutConsentProps): JSX.Element => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license.buy")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const checkboxId = useId()

  const { redirect } = useAuthRedirect()

  const refreshLicense = () => queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEYS.ALL })

  const { isPending, mutate } = useMutation({
    ...startCheckoutMutation,
    onError: async (error) => {
      onClose()
      toast.error(errorMessage(error))
      await refreshLicense()
    },
    onSuccess: async (checkout) => {
      if ("alreadyActive" in checkout) {
        onClose()
        toast.error(t("alreadyActive", { email: CONTACT_EMAIL }))
        await refreshLicense()
        return
      }
      await refreshLicense()
      globalThis.location.href = checkout.url
    },
  })

  const form = useForm({
    defaultValues: { withdrawalConsent: false },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      mutate({ locale: getCurrentLocale(), redirect, tier, ...consentSchema.parse(value) })
    },
    validators: { onChange: consentSchema },
  })

  const name = tTier(`tiers.${tier}.name`)

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <form.Field name="withdrawalConsent">
        {(field) => {
          const isInvalid = isFieldInvalid(field)

          return (
            <Field className="rounded-lg border p-3" data-invalid={isInvalid} orientation="horizontal">
              <Checkbox
                aria-describedby={`${checkboxId}-error`}
                aria-labelledby={`${checkboxId}-label`}
                className="mt-0.5"
                id={checkboxId}
                isInvalid={isInvalid}
                isRequired
                isSelected={field.state.value}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(isSelected) => {
                  field.handleChange(isSelected)
                }}
                validationBehavior="aria"
              />
              <FieldContent>
                <FieldLabel className="font-normal text-pretty text-foreground select-text" htmlFor={checkboxId} id={`${checkboxId}-label`}>
                  {t("consent.label", { days: REFUND_TERMS.WITHDRAWAL_DAYS, tier: name })}
                </FieldLabel>
                {isInvalid && (
                  <ValidationFieldError
                    id={`${checkboxId}-error`}
                    message={fieldErrorMessage(field.state.meta.errors)}
                    namespace="license.validations"
                  />
                )}
              </FieldContent>
            </Field>
          )
        }}
      </form.Field>
      <p className="text-xs leading-relaxed text-pretty text-muted-foreground">
        {t.rich("consent.refund", { ...LEGAL_TAGS, days: REFUND_TERMS.WITHDRAWAL_DAYS })}
      </p>
      <p className="text-xs leading-relaxed text-pretty text-muted-foreground">{t.rich("consent.agreement", LEGAL_TAGS)}</p>
      <DialogFooter>
        <DialogClose isDisabled={isPending}>{t("consent.cancel")}</DialogClose>
        <Button isPending={isPending} type="submit">
          {isPending && <Spinner />}
          {isPending ? t("pending") : t("consent.continue")}
        </Button>
      </DialogFooter>
    </form>
  )
}
