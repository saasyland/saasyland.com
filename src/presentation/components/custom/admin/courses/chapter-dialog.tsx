import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"
import { chapterZodSchemas } from "~/src/modules/chapter/chapter.zod"
import { createChapterMutation } from "~/src/modules/chapter/use-cases/create-chapter"
import { updateChapterMutation } from "~/src/modules/chapter/use-cases/update-chapter"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFormLocale } from "~/src/hooks/use-form-locale"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { CourseTextAreaField, CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { FormLanguages, TranslationsSheet } from "~/src/presentation/components/custom/admin/form-languages"

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
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      if (chapter === undefined) {
        create.mutate({ ...value, courseId })
        return
      }
      update.mutate({ ...value, chapterId: chapter.id })
    },
    validators: { onChange: chapterSchema },
  })

  const languages = useFormLocale(form, ({ summary, title }) => ({ texts: { summary, title } }))

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      {trigger}
      <Dialog className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            void submitForm(event, form, languages.showFirstInvalid)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(chapter === undefined ? "add" : "edit")}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <FormLanguages languages={languages}>
              <TranslationsSheet
                fields={[
                  { id: "title", label: t("title") },
                  { id: "summary", label: t("summary") },
                ]}
                languages={languages}
              >
                {(text, language, label) => (
                  <form.Field name={`${text}.${language}`}>
                    {(field) => (
                      <>
                        {text === "title" && (
                          <CourseTextField field={field} id={`translation-${text}-${language}`} label={label} lang={language} />
                        )}
                        {text === "summary" && (
                          <CourseTextAreaField field={field} id={`translation-${text}-${language}`} label={label} lang={language} />
                        )}
                      </>
                    )}
                  </form.Field>
                )}
              </TranslationsSheet>
            </FormLanguages>
            <form.Field key={`title-${languages.locale}`} name={`title.${languages.locale}`}>
              {(field) => (
                <CourseTextField
                  field={field}
                  id={`chapter-title-${languages.locale}`}
                  label={t("title")}
                  lang={languages.locale}
                  source={languages.texts.title[I18N.DEFAULT_LOCALE]}
                />
              )}
            </form.Field>
            <form.Field key={`summary-${languages.locale}`} name={`summary.${languages.locale}`}>
              {(field) => (
                <CourseTextAreaField
                  field={field}
                  id={`chapter-summary-${languages.locale}`}
                  label={t("summary")}
                  lang={languages.locale}
                  source={languages.texts.summary[I18N.DEFAULT_LOCALE]}
                />
              )}
            </form.Field>
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
