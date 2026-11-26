import { type JSX, useId, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Building2, ImageUp, Trash2 } from "lucide-react"
import { FileTrigger } from "react-aria-components"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { type StringField, fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { BUSINESS_PROFILE_QUERY_KEYS, BUSINESS_PROFILE_VALIDATION_PARAMS } from "~/src/modules/business-profile/business-profile.constants"
import {
  BUSINESS_LOGO_MAX_MEGABYTES,
  BUSINESS_LOGO_MAX_SIDE,
  BUSINESS_LOGO_QUALITY,
  BUSINESS_LOGO_SOURCE_TYPES,
  BUSINESS_LOGO_STORED_TYPES,
  businessLogoPath,
  logoFormData,
} from "~/src/modules/business-profile/business-profile.logo"
import type { BusinessProfile } from "~/src/modules/business-profile/business-profile.types"
import { businessProfileZodSchemas } from "~/src/modules/business-profile/business-profile.zod"
import { businessProfileQuery } from "~/src/modules/business-profile/use-cases/get-business-profile"
import { removeBusinessLogoMutation } from "~/src/modules/business-profile/use-cases/remove-business-logo"
import { updateBusinessProfileMutation } from "~/src/modules/business-profile/use-cases/update-business-profile"
import { uploadBusinessLogoMutation } from "~/src/modules/business-profile/use-cases/upload-business-logo"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFileSize } from "~/src/hooks/use-file-size"

import { encodeContainedImage } from "~/src/lib/image-encoding"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const VALIDATION_NAMESPACE = "business-profile.validations"
const SOURCE_EXTENSIONS = Object.keys(BUSINESS_LOGO_SOURCE_TYPES)
const SOURCE_NAMES = SOURCE_EXTENSIONS.map((extension) => extension.toUpperCase())
const ACCEPTED_TYPES = [...SOURCE_EXTENSIONS.map((extension) => `.${extension}`), ...Object.values(BUSINESS_LOGO_SOURCE_TYPES)]
const LOGO_FILE_ERROR_ID = "business-logo-file-error"

interface LogoValues {
  readonly file: File | undefined
}

const NO_FILE: LogoValues = { file: undefined }

const FieldMessage = ({ field, id }: { readonly field: StringField; readonly id: string }): JSX.Element | undefined => {
  if (!isFieldInvalid(field)) {
    return
  }

  return (
    <ValidationFieldError
      id={`${id}-error`}
      message={fieldErrorMessage(field.state.meta.errors)}
      namespace={VALIDATION_NAMESPACE}
      params={BUSINESS_PROFILE_VALIDATION_PARAMS}
    />
  )
}

interface TextFieldProps {
  readonly autoComplete: "email" | "organization"
  readonly field: StringField
  readonly id: string
  readonly label: string
  readonly type?: "email" | "text"
}

const BusinessTextField = ({ autoComplete, field, id, label, type = "text" }: TextFieldProps): JSX.Element => (
  <Field data-invalid={isFieldInvalid(field)}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Input
      aria-describedby={`${id}-error`}
      aria-invalid={isFieldInvalid(field)}
      autoComplete={autoComplete}
      id={id}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value)
      }}
      type={type}
      value={field.state.value}
    />
    <FieldMessage field={field} id={id} />
  </Field>
)

export const BusinessProfileCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.business")
  const id = useId()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { address, name, supportEmail } = useSuspenseQuery(businessProfileQuery).data

  const update = useMutation({
    ...updateBusinessProfileMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BUSINESS_PROFILE_QUERY_KEYS.ALL })
      toast.success(t("saved"))
    },
  })

  const form = useForm({
    defaultValues: { address, name, supportEmail } satisfies BusinessProfile["updateBusinessProfile"],
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      update.mutate(value)
    },
    validators: { onChange: businessProfileZodSchemas.updateBusinessProfile },
  })

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <form
        noValidate
        onSubmit={(event) => {
          void submitForm(event, form)
        }}
      >
        <CardContent className="pb-(--card-spacing)">
          <FieldGroup>
            <form.Field name="name">
              {(field) => <BusinessTextField autoComplete="organization" field={field} id={`${id}-name`} label={t("name")} />}
            </form.Field>
            <form.Field name="supportEmail">
              {(field) => (
                <BusinessTextField autoComplete="email" field={field} id={`${id}-email`} label={t("supportEmail")} type="email" />
              )}
            </form.Field>
            <form.Field name="address">
              {(field) => (
                <Field data-invalid={isFieldInvalid(field)}>
                  <FieldLabel htmlFor={`${id}-address`}>{t("address")}</FieldLabel>
                  <Textarea
                    aria-describedby={`${id}-address-hint ${id}-address-error`}
                    aria-invalid={isFieldInvalid(field)}
                    autoComplete="street-address"
                    id={`${id}-address`}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    value={field.state.value}
                  />
                  <FieldDescription id={`${id}-address-hint`}>{t("addressHint")}</FieldDescription>
                  <FieldMessage field={field} id={`${id}-address`} />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button isPending={update.isPending} size="sm" type="submit">
            {t("save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

const encodeLogo = (file: File) =>
  encodeContainedImage({
    fallbackType: BUSINESS_LOGO_STORED_TYPES.png,
    file,
    maxSide: BUSINESS_LOGO_MAX_SIDE,
    preferredType: BUSINESS_LOGO_STORED_TYPES.webp,
    quality: BUSINESS_LOGO_QUALITY,
  })

const useLogoActions = () => {
  const t = useTranslations("pages.admin.settings.logo")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isEncoding, setEncoding] = useState(false)

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const refresh = async (message: "removed" | "uploaded"): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: BUSINESS_PROFILE_QUERY_KEYS.ALL })
    toast.success(t(message))
  }
  const upload = useMutation({ ...uploadBusinessLogoMutation, onError, onSuccess: () => refresh("uploaded") })
  const remove = useMutation({ ...removeBusinessLogoMutation, onError, onSuccess: () => refresh("removed") })

  const form = useForm({
    defaultValues: NO_FILE,
    listeners: { onBlur: validateOnBlur },
    onSubmit: async ({ formApi, value }) => {
      const { file } = businessProfileZodSchemas.businessLogoSource.parse(value)
      setEncoding(true)
      const image = await encodeLogo(file).catch(() => {})
      setEncoding(false)
      if (image === undefined) {
        toast.error(t("unreadable"))
        return
      }
      upload.mutate(logoFormData(image), {
        onSuccess: () => {
          formApi.reset()
        },
      })
    },
    validators: { onChange: businessProfileZodSchemas.businessLogoSource },
  })

  return { form, isUploading: isEncoding || upload.isPending, remove }
}

export const BusinessLogoCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.logo")
  const format = useFormatter()
  const fileSize = useFileSize()

  const { logo, name } = useSuspenseQuery(businessProfileQuery).data
  const { form, isUploading, remove } = useLogoActions()

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <Card>
        <CardHeader className="border-b">
          <CardTitle>
            <h2>{t("title")}</h2>
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-(--card-spacing)">
          <div
            className="flex size-28 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40 p-3"
            data-slot="business-logo"
          >
            {logo !== null && (
              <img
                alt={t("preview", { name })}
                className="max-h-full max-w-full object-contain"
                decoding="async"
                src={businessLogoPath(logo)}
              />
            )}
            {logo === null && <Building2 aria-hidden className="size-8 text-muted-foreground" />}
          </div>
          <form.Field name="file">
            {(field) => (
              <Field data-invalid={isFieldInvalid(field)}>
                <FieldLabel>{t("file")}</FieldLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <FileTrigger
                    acceptedFileTypes={ACCEPTED_TYPES}
                    onSelect={(files) => {
                      field.handleChange(files?.[0])
                      field.handleBlur()
                    }}
                  >
                    <Button aria-describedby={LOGO_FILE_ERROR_ID} aria-invalid={isFieldInvalid(field)} size="sm" variant="outline">
                      <ImageUp aria-hidden className="size-4" />
                      {t("choose")}
                    </Button>
                  </FileTrigger>
                  {field.state.value !== undefined && (
                    <span className="min-w-0 truncate font-mono text-spec text-muted-foreground">
                      {field.state.value.name} · {fileSize(field.state.value.size)}
                    </span>
                  )}
                </div>
                <FieldDescription>
                  {t("hint", {
                    max: BUSINESS_LOGO_MAX_MEGABYTES,
                    side: String(BUSINESS_LOGO_MAX_SIDE),
                    types: format.list(SOURCE_NAMES, { type: "disjunction" }),
                  })}
                </FieldDescription>
                {isFieldInvalid(field) && (
                  <ValidationFieldError
                    id={LOGO_FILE_ERROR_ID}
                    message={fieldErrorMessage(field.state.meta.errors)}
                    namespace={VALIDATION_NAMESPACE}
                    params={BUSINESS_PROFILE_VALIDATION_PARAMS}
                  />
                )}
              </Field>
            )}
          </form.Field>
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2">
          {logo !== null && (
            <Button
              isPending={remove.isPending}
              onPress={() => {
                remove.mutate()
              }}
              size="sm"
              variant="outline"
            >
              <Trash2 aria-hidden className="size-4" />
              {t("remove")}
            </Button>
          )}
          <Button isPending={isUploading} size="sm" type="submit">
            {t(logo === null ? "upload" : "replace")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
