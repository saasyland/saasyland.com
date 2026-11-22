import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { idField } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import { LESSON_ACCESS, LESSON_ACCESS_LEVELS, LESSON_STATUS, LESSON_STATUSES } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFormLocale } from "~/src/hooks/use-form-locale"
import { useVideoLibrary } from "~/src/hooks/use-video-library"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { CourseOptionField, CourseTextAreaField, CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { FormLanguages, TranslationsSheet } from "~/src/presentation/components/custom/admin/form-languages"

const NO_VIDEO = "none"

const lessonFormSchema = lessonZodSchemas.createLesson.omit({ chapterId: true }).extend({ videoId: idField })

type LessonFormValues = Omit<Lesson["createLesson"], "chapterId" | "videoId"> & { videoId: string }

const NEW_LESSON: LessonFormValues = {
  access: LESSON_ACCESS.PAID,
  slug: "",
  status: LESSON_STATUS.DRAFT,
  summary: { [I18N.DEFAULT_LOCALE]: "" },
  title: { [I18N.DEFAULT_LOCALE]: "" },
  videoId: NO_VIDEO,
}

interface LessonDialogProps {
  readonly chapterId: string
  readonly trigger: ReactNode
}

export const LessonDialog = ({ chapterId, trigger }: LessonDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lesson")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isOpen, setOpen] = useState(false)

  const { holders } = useCourseAccessNames()
  const library = useVideoLibrary(isOpen)

  const onSuccess = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    toast.success(t("saved"))
    setOpen(false)
  }
  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const create = useMutation({ ...createLessonMutation, onError, onSuccess })

  const form = useForm({
    defaultValues: NEW_LESSON,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value: { videoId, ...fields } }) => {
      const video = videoId === NO_VIDEO ? {} : { videoId }
      create.mutate({ ...fields, ...video, chapterId })
    },
    validators: { onChange: lessonFormSchema },
  })

  const languages = useFormLocale(form, ({ summary, title }) => ({ texts: { summary, title } }))

  const videoLabels = new Map([[NO_VIDEO, t("noVideo")], ...library])

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      {trigger}
      <Dialog className="sm:max-w-2xl">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            void submitForm(event, form, languages.showFirstInvalid)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
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
                  id={`lesson-title-${languages.locale}`}
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
                  id={`lesson-summary-${languages.locale}`}
                  label={t("summary")}
                  lang={languages.locale}
                  source={languages.texts.summary[I18N.DEFAULT_LOCALE]}
                />
              )}
            </form.Field>

            <form.Field name="slug">{(field) => <CourseTextField field={field} id="lesson-slug" isCode label={t("slug")} />}</form.Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <form.Field name="access">
                {(field) => (
                  <CourseOptionField
                    label={t("access")}
                    onChange={field.handleChange}
                    options={LESSON_ACCESS_LEVELS}
                    value={field.state.value}
                  >
                    {(access) => t(`accessLevels.${access}`, { holders })}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="status">
                {(field) => (
                  <CourseOptionField label={t("status")} onChange={field.handleChange} options={LESSON_STATUSES} value={field.state.value}>
                    {(status) => t(`statuses.${status}`)}
                  </CourseOptionField>
                )}
              </form.Field>
              <form.Field name="videoId">
                {(field) => (
                  <CourseOptionField
                    label={t("video")}
                    onChange={field.handleChange}
                    options={[...videoLabels.keys()]}
                    value={field.state.value}
                  >
                    {(videoId) => videoLabels.get(videoId)}
                  </CourseOptionField>
                )}
              </form.Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button isPending={create.isPending} type="submit">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
