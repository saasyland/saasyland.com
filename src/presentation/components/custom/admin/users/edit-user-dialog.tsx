import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { updateUserMutation } from "~/src/modules/user/use-cases/update-user"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { UserTextField } from "~/src/presentation/components/custom/admin/users/user-text-field"

interface EditUserDialogProps {
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly user: User["select"]
}

export const EditUserDialog = ({ isOpen, onOpenChange, user }: EditUserDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.users.actions")
  const nameId = useId()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const update = useMutation({
    ...updateUserMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL })
      toast.success(t("feedback.editSuccess"))
      onOpenChange(false)
    },
  })

  const defaultValues: User["updateUser"] = { name: user.name, userId: user.id }

  const form = useForm({
    defaultValues,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      update.mutate(value)
    },
    validators: { onChange: userZodSchemas.updateUser },
  })

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("editDialog.title")}</DialogTitle>
        <DialogDescription>{t("editDialog.description", { email: user.email })}</DialogDescription>
      </DialogHeader>

      <form
        noValidate
        onSubmit={(event) => {
          void submitForm(event, form)
        }}
      >
        <FieldGroup>
          <form.Field name="name">
            {(field) => <UserTextField autoComplete="name" field={field} id={nameId} label={t("editDialog.name")} />}
          </form.Field>
          <DialogFooter>
            <Button
              onPress={() => {
                onOpenChange(false)
              }}
              type="button"
              variant="outline"
            >
              {t("editDialog.cancel")}
            </Button>
            <Button isPending={update.isPending} type="submit">
              {t("editDialog.confirm")}
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    </Dialog>
  )
}
