import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { LocateFixed } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { updatePreferencesMutation } from "~/src/modules/user/use-cases/update-preferences"
import { TIMEZONE_CODES } from "~/src/modules/user/user.schema"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "~/src/presentation/components/shadcn/combobox"
import { Field, FieldDescription, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const preferencesSchema = userZodSchemas.updatePreferences

const resolveTimezone = (timeZone?: string): string => new Intl.DateTimeFormat(I18N.DEFAULT_LOCALE, { timeZone }).resolvedOptions().timeZone

export const PreferencesCard = (): JSX.Element => {
  const t = useTranslations()
  const descriptionId = useId()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const timezone = useSuspenseQuery(getCurrentSessionQuery).data?.user.timezone ?? I18N.DEFAULT_TIMEZONE

  const updatePreferences = useMutation({
    ...updatePreferencesMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CURRENT })
      toast.success(t("components.custom.preferences-card.saved"))
    },
  })

  const form = useForm({
    defaultValues: { timezone },
    onSubmit: ({ value }) => {
      updatePreferences.mutate(value)
    },
    validators: { onChange: preferencesSchema, onSubmit: preferencesSchema },
  })

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("components.custom.preferences-card.title")}</h2>
        </CardTitle>
        <CardDescription>{t("components.custom.preferences-card.description")}</CardDescription>
      </CardHeader>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <CardContent className="pb-(--card-spacing)">
          <form.Field name="timezone">
            {(field) => (
              <Field>
                <Combobox
                  allowsEmptyCollection
                  className="flex flex-col gap-2"
                  defaultInputValue={t(`timezones.${field.state.value}`)}
                  menuTrigger="focus"
                  onBlur={field.handleBlur}
                  onChange={(key) => {
                    const selected = preferencesSchema.shape.timezone.safeParse(key)
                    if (selected.success) {
                      field.handleChange(selected.data)
                    }
                  }}
                  value={field.state.value}
                >
                  <FieldLabel>{t("components.custom.preferences-card.timezone.label")}</FieldLabel>
                  <ComboboxInput
                    aria-describedby={descriptionId}
                    placeholder={t("components.custom.preferences-card.timezone.placeholder")}
                  />
                  <FieldDescription id={descriptionId}>{t("components.custom.preferences-card.timezone.description")}</FieldDescription>
                  <ComboboxContent>
                    <ComboboxList
                      renderEmptyState={() => <ComboboxEmpty>{t("components.custom.preferences-card.timezone.empty")}</ComboboxEmpty>}
                    >
                      {TIMEZONE_CODES.map((code) => (
                        <ComboboxItem id={code} key={code}>
                          {t(`timezones.${code}`)}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <div>
                  <Button
                    onPress={() => {
                      const detected = resolveTimezone()
                      const supported = TIMEZONE_CODES.find((code) => resolveTimezone(code) === detected)
                      if (supported === undefined) {
                        toast.error(t("components.custom.preferences-card.timezone.unsupported", { timezone: detected }))
                        return
                      }
                      field.handleChange(supported)
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <LocateFixed aria-hidden />
                    {t("components.custom.preferences-card.timezone.detect")}
                  </Button>
                </div>
              </Field>
            )}
          </form.Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button isPending={updatePreferences.isPending} size="sm" type="submit">
            {t("components.custom.preferences-card.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export const PreferencesCardPending = (): JSX.Element => (
  <Card>
    <CardHeader className="border-b">
      <Skeleton className="h-lh w-28 scale-y-70 text-base leading-snug" />
      <Skeleton className="h-lh w-80 max-w-full scale-y-70 text-sm" />
    </CardHeader>
    <CardContent className="flex flex-col gap-2 pb-(--card-spacing)">
      <Skeleton className="h-lh w-20 scale-y-70 text-sm leading-none" />
      <Skeleton className="h-8 w-full rounded-lg" />
      <div className="flex flex-col text-sm leading-normal">
        <Skeleton className="h-lh w-full max-w-[60ch] scale-y-70" />
        <Skeleton className="h-lh w-1/2 scale-y-70 sm:hidden" />
      </div>
      <Skeleton className="h-7 w-48 rounded-lg" />
    </CardContent>
    <CardFooter className="justify-end">
      <Skeleton className="h-7 w-36 rounded-lg" />
    </CardFooter>
  </Card>
)
