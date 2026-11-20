import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { chapterZodSchemas } from "~/src/modules/chapter/chapter.zod"
import { createChapterMutation } from "~/src/modules/chapter/use-cases/create-chapter"
import { updateChapterMutation } from "~/src/modules/chapter/use-cases/update-chapter"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"

import { CourseTextAreaField, CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { LocaleTabs } from "~/src/presentation/components/custom/admin/courses/locale-tabs"

const chapterSchema = chapterZodSchemas.updateChapter.pick({ summary: true, title: true })

interface ChapterDialogProps {
  readonly chapter?: { readonly id: string; readonly summary: LocalizedText; readonly title: LocalizedText }
  readonly courseId: string
  readonly trigger: ReactNode
}

export const ChapterDialog = ({ chapter, courseId, trigger }: ChapterDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.chapter")
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
  const create = useMutation({ ...createChapterMutation, onError, onSuccess })
  const update = useMutation({ ...updateChapterMutation, onError, onSuccess })

  const form = useForm({
    defaultValues: { summary: chapter?.summary ?? {}, title: chapter?.title ?? { [I18N.DEFAULT_LOCALE]: "" } },
    onSubmit: ({ value }) => {
      if (chapter === undefined) {
        create.mutate({ ...value, courseId })
        return
      }
      update.mutate({ ...value, chapterId: chapter.id })
    },
    validators: { onChange: chapterSchema, onSubmit: chapterSchema },
  })

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      {trigger}
      <Dialog className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(chapter === undefined ? "add" : "edit")}</DialogTitle>
          </DialogHeader>
          <LocaleTabs label={t("textLanguages")}>
            {(locale) => (
              <div className="flex flex-col gap-4">
                <form.Field name={`title.${locale}`}>
                  {(field) => <CourseTextField field={field} id={`chapter-title-${locale}`} label={t("title")} lang={locale} />}
                </form.Field>
                <form.Field name={`summary.${locale}`}>
                  {(field) => <CourseTextAreaField field={field} id={`chapter-summary-${locale}`} label={t("summary")} lang={locale} />}
                </form.Field>
              </div>
            )}
          </LocaleTabs>
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
