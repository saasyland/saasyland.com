import { type JSX, useId, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { DEFAULT_ROLE_CODE, ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getLocaleName } from "~/src/modules/_core/constants/locale"
import { INVITATION_LIFETIME_DAYS, INVITATION_QUERY_KEYS } from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import { createInvitationMutation } from "~/src/modules/invitation/use-cases/create-invitation"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/src/presentation/components/shadcn/dialog"
import { Field, FieldGroup } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { UserTextField } from "~/src/presentation/components/custom/admin/users/user-text-field"

const { shape } = invitationZodSchemas.createInvitation

export const InviteUserDialog = (): JSX.Element => {
  const t = useTranslations("pages.admin.users")
  const id = useId()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isOpen, setOpen] = useState(false)

  const invite = useMutation({
    ...createInvitationMutation,
    onError: (error) => {
      toast.error(error.message === ERROR_CODES.CONFLICT ? t("invitations.feedback.conflict") : errorMessage(error))
    },
    onSuccess: async ({ email }) => {
      await queryClient.invalidateQueries({ queryKey: INVITATION_QUERY_KEYS.ALL })
      toast.success(t("invitations.feedback.sent", { email }))
      setOpen(false)
    },
  })

  const defaultValues: Invitation["createInvitation"] = { email: "", locale: shape.locale.parse(locale), role: DEFAULT_ROLE_CODE }

  const form = useForm({
    defaultValues,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      invite.mutate(value)
    },
    validators: { onChange: invitationZodSchemas.createInvitation },
  })

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button className="h-10 gap-2 whitespace-nowrap" size="sm" variant="outline">
        <Send aria-hidden className="size-4" />
        {t("invitations.invite")}
      </Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>{t("invitations.dialog.title")}</DialogTitle>
          <DialogDescription>{t("invitations.dialog.description", { days: INVITATION_LIFETIME_DAYS })}</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={(event) => {
            void submitForm(event, form)
          }}
        >
          <FieldGroup>
            <form.Field name="email">
              {(field) => (
                <UserTextField autoComplete="email" field={field} id={`${id}-email`} label={t("invitations.dialog.email")} type="email" />
              )}
            </form.Field>
            <form.Field name="role">
              {(field) => (
                <Field>
                  <Select
                    className="w-full"
                    fieldLabel={t("invitations.dialog.role")}
                    onChange={(key) => {
                      field.handleChange(shape.role.parse(key))
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_VALUES.map((role) => (
                        <SelectItem id={role} key={role}>
                          {t(`filters.role.options.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="locale">
              {(field) => (
                <Field>
                  <Select
                    className="w-full"
                    fieldLabel={t("invitations.dialog.language")}
                    onChange={(key) => {
                      field.handleChange(shape.locale.parse(key))
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {I18N.SUPPORTED_LOCALES.map((option) => (
                        <SelectItem id={option} key={option} lang={option}>
                          {getLocaleName(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <DialogFooter>
              <Button
                onPress={() => {
                  setOpen(false)
                }}
                type="button"
                variant="outline"
              >
                {t("invitations.dialog.cancel")}
              </Button>
              <Button isPending={invite.isPending} type="submit">
                {t("invitations.dialog.confirm")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
