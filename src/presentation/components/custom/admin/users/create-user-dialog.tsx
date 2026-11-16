import { type JSX, useId, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { DEFAULT_ROLE_CODE, ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"

import { createUserMutation } from "~/src/modules/user/use-cases/create-user"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

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

const NEW_USER: User["createUser"] = { email: "", name: "", password: "", role: DEFAULT_ROLE_CODE }

export const CreateUserDialog = (): JSX.Element => {
  const t = useTranslations("pages.admin.users")
  const id = useId()
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isOpen, setOpen] = useState(false)

  const create = useMutation({
    ...createUserMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async ({ user }) => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL })
      toast.success(t("actions.feedback.createSuccess", { name: user.name }))
      setOpen(false)
      await router.navigate({ params: { userId: user.id }, to: "/admin/users/$userId" })
    },
  })

  const form = useForm({
    defaultValues: NEW_USER,
    onSubmit: ({ value }) => {
      create.mutate(value)
    },
    validators: { onChange: userZodSchemas.createUser, onSubmit: userZodSchemas.createUser },
  })

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button className="h-10 gap-2 whitespace-nowrap" size="sm">
        <UserPlus aria-hidden className="size-4" />
        {t("actions.addUser")}
      </Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>{t("actions.createDialog.title")}</DialogTitle>
          <DialogDescription>{t("actions.createDialog.description")}</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => <UserTextField autoComplete="name" field={field} id={`${id}-name`} label={t("actions.createDialog.name")} />}
            </form.Field>
            <form.Field name="email">
              {(field) => (
                <UserTextField autoComplete="email" field={field} id={`${id}-email`} label={t("actions.createDialog.email")} type="email" />
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => (
                <UserTextField
                  autoComplete="new-password"
                  field={field}
                  id={`${id}-password`}
                  label={t("actions.createDialog.password")}
                  type="password"
                />
              )}
            </form.Field>
            <form.Field name="role">
              {(field) => (
                <Field>
                  <Select
                    className="w-full"
                    fieldLabel={t("actions.createDialog.role")}
                    onChange={(key) => {
                      field.handleChange(userZodSchemas.createUser.shape.role.parse(key))
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
            <DialogFooter>
              <Button
                onPress={() => {
                  setOpen(false)
                }}
                type="button"
                variant="outline"
              >
                {t("actions.createDialog.cancel")}
              </Button>
              <Button isPending={create.isPending} type="submit">
                {t("actions.createDialog.confirm")}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
