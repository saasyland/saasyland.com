import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"
import { updateLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/update-lesson-attachment"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"

import { CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

const titleSchema = lessonAttachmentZodSchemas.updateLessonAttachment.pick({ title: true })

interface AttachmentTitleDialogProps {
  readonly attachment: { readonly id: string; readonly title: LocalizedText }
  readonly trigger: ReactNode
}

export const AttachmentTitleDialog = ({ attachment, trigger }: AttachmentTitleDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isOpen, setOpen] = useState(false)

  const update = useMutation({
    ...updateLessonAttachmentMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("saved"))
      setOpen(false)
    },
  })

  const form = useForm({
    defaultValues: { title: attachment.title },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      update.mutate({ attachmentId: attachment.id, title: value.title })
    },
    validators: { onChange: titleSchema },
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
            <DialogTitle>{t("editFile")}</DialogTitle>
          </DialogHeader>
          <LocaleTabs label={t("titleLanguages")}>
            {(locale) => (
              <form.Field name={`title.${locale}`}>
                {(field) => <CourseTextField field={field} id={`attachment-title-${locale}`} label={t("titleLabel")} lang={locale} />}
              </form.Field>
            )}
          </LocaleTabs>
          <DialogFooter>
            <Button isPending={update.isPending} type="submit">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
