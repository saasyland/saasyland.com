import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Upload } from "lucide-react"
import { FileTrigger } from "react-aria-components"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS, COURSE_VALIDATION_PARAMS } from "~/src/modules/course/course.constants"
import {
  LESSON_ATTACHMENT_EXTENSIONS,
  LESSON_ATTACHMENT_FILE_TYPES,
  LESSON_ATTACHMENT_MAX_MEGABYTES,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { uploadFormData } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"
import { uploadLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/upload-lesson-attachment"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFileSize } from "~/src/hooks/use-file-size"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const uploadSchema = lessonAttachmentZodSchemas.uploadLessonAttachment.out.pick({ file: true, title: true })
const ACCEPTED_TYPES = [
  ...LESSON_ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`),
  ...new Set(Object.values(LESSON_ATTACHMENT_FILE_TYPES)),
]

interface FileAttachmentDialogProps {
  readonly lessonId: string
  readonly trigger: ReactNode
}

interface FileAttachmentValues {
  readonly file: File | undefined
  readonly title: LocalizedText
}

interface FileAttachmentFormOptions {
  readonly lessonId: string
  readonly onSaved: () => void
}

const NEW_FILE: FileAttachmentValues = { file: undefined, title: { [I18N.DEFAULT_LOCALE]: "" } }

const useFileAttachmentForm = ({ lessonId, onSaved }: FileAttachmentFormOptions) => {
  const t = useTranslations("pages.admin.courses.materials")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const onSuccess = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    toast.success(t("saved"))
    onSaved()
  }
  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const upload = useMutation({ ...uploadLessonAttachmentMutation, onError, onSuccess })

  const form = useForm({
    defaultValues: NEW_FILE,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      const parsed = uploadSchema.parse(value)
      upload.mutate(uploadFormData({ file: parsed.file.file, lessonId, title: parsed.title }))
    },
    validators: { onChange: uploadSchema },
  })

  return { form, isPending: upload.isPending }
}

export const FileAttachmentDialog = ({ lessonId, trigger }: FileAttachmentDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const format = useFormatter()
  const fileSize = useFileSize()
  const [isOpen, setOpen] = useState(false)

  const { form, isPending } = useFileAttachmentForm({
    lessonId,
    onSaved: () => {
      setOpen(false)
    },
  })

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      {trigger}
      <Dialog className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            void submitForm(event, form)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("uploadFile")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <LocaleTabs label={t("titleLanguages")}>
              {(locale) => (
                <form.Field name={`title.${locale}`}>
                  {(field) => <CourseTextField field={field} id={`file-title-${locale}`} label={t("titleLabel")} lang={locale} />}
                </form.Field>
              )}
            </LocaleTabs>
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
                      <Button
                        aria-describedby="file-attachment-file-error"
                        aria-invalid={isFieldInvalid(field)}
                        size="sm"
                        variant="outline"
                      >
                        <Upload aria-hidden className="size-4" />
                        {t("chooseFile")}
                      </Button>
                    </FileTrigger>
                    {field.state.value !== undefined && (
                      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                        {field.state.value.name} · {fileSize(field.state.value.size)}
                      </span>
                    )}
                  </div>
                  <FieldDescription>
                    {t("fileHint", { max: LESSON_ATTACHMENT_MAX_MEGABYTES, types: format.list(LESSON_ATTACHMENT_EXTENSIONS) })}
                  </FieldDescription>
                  {isFieldInvalid(field) && (
                    <ValidationFieldError
                      id="file-attachment-file-error"
                      message={fieldErrorMessage(field.state.meta.errors)}
                      namespace="course.validations"
                      params={COURSE_VALIDATION_PARAMS}
                    />
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <DialogFooter>
            <Button isPending={isPending} type="submit">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
