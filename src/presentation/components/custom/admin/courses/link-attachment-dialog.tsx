import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"
import { createLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/create-lesson-attachment"
import { updateLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/update-lesson-attachment"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

const linkSchema = lessonAttachmentZodSchemas.createLessonAttachment.pick({ title: true, url: true })

interface LinkAttachmentDialogProps {
  readonly link?: { readonly id: string; readonly title: LocalizedText; readonly url: string }
  readonly lessonId: string
  readonly trigger: ReactNode
}

export const LinkAttachmentDialog = ({ lessonId, link, trigger }: LinkAttachmentDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.materials")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isOpen, setOpen] = useState(false)

  const onSuccess = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    toast.success(t("saved"))
    setOpen(false)
  }
  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const create = useMutation({ ...createLessonAttachmentMutation, onError, onSuccess })
  const update = useMutation({ ...updateLessonAttachmentMutation, onError, onSuccess })

  const form = useForm({
    defaultValues: { title: link?.title ?? { [I18N.DEFAULT_LOCALE]: "" }, url: link?.url ?? "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      if (link === undefined) {
        create.mutate({ ...value, lessonId })
        return
      }
      update.mutate({ ...value, attachmentId: link.id })
    },
    validators: { onChange: linkSchema },
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
            <DialogTitle>{t(link === undefined ? "addLink" : "editLink")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <LocaleTabs label={t("titleLanguages")}>
              {(locale) => (
                <form.Field name={`title.${locale}`}>
                  {(field) => <CourseTextField field={field} id={`link-title-${locale}`} label={t("titleLabel")} lang={locale} />}
                </form.Field>
              )}
            </LocaleTabs>
            <form.Field name="url">{(field) => <CourseTextField field={field} id="link-url" isCode label={t("url")} />}</form.Field>
          </FieldGroup>
          <DialogFooter>
            <Button isPending={create.isPending || update.isPending} type="submit">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
