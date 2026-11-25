import { type JSX, type ReactNode, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileVideo, X } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import {
  LESSON_ACCESS,
  LESSON_ACCESS_LEVELS,
  LESSON_FORMAT,
  LESSON_FORMATS,
  LESSON_STATUS,
  LESSON_STATUSES,
} from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"
import { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"

import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useFileSize } from "~/src/hooks/use-file-size"
import { useFormLocale } from "~/src/hooks/use-form-locale"
import { useSlugConflict } from "~/src/hooks/use-slug-conflict"
import { uploadLessonVideo } from "~/src/hooks/use-video-upload"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { CourseOptionField, CourseTextAreaField, CourseTextField } from "~/src/presentation/components/custom/admin/courses/course-fields"
import { VideoDropZone } from "~/src/presentation/components/custom/admin/courses/video-drop-zone"
import { FormLanguages, TranslationsSheet } from "~/src/presentation/components/custom/admin/form-languages"

const lessonFormSchema = lessonZodSchemas.createLesson.omit({ chapterId: true })

const NEW_LESSON: Omit<Lesson["createLesson"], "chapterId"> = {
  access: LESSON_ACCESS.PAID,
  format: LESSON_FORMAT.VIDEO,
  slug: "",
  status: LESSON_STATUS.DRAFT,
  summary: { [I18N.DEFAULT_LOCALE]: "" },
  title: { [I18N.DEFAULT_LOCALE]: "" },
}

interface RecordingFieldProps {
  readonly onChange: (file: File | undefined) => void
  readonly recording: File | undefined
}

const RecordingField = ({ onChange, recording }: RecordingFieldProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lesson")
  const fileSize = useFileSize()

  return (
    <Field>
      <FieldLabel>{t("recording")}</FieldLabel>
      {recording === undefined && <VideoDropZone isCompact label={t("recording")} onFile={onChange} />}
      {recording !== undefined && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 py-1.5 pr-1.5 pl-3">
          <FileVideo aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-mono text-spec text-foreground">
            {recording.name} · {fileSize(recording.size)}
          </span>
          <Button
            aria-label={t("removeRecording", { name: recording.name })}
            className="size-8 text-muted-foreground"
            onPress={() => {
              onChange(undefined)
            }}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden className="size-4" />
          </Button>
        </div>
      )}
      <FieldDescription>{t("recordingHint")}</FieldDescription>
    </Field>
  )
}

interface LessonDialogProps {
  readonly chapterId: string
  readonly trigger: ReactNode
}

export const LessonDialog = ({ chapterId, trigger }: LessonDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lesson")
  const queryClient = useQueryClient()
  const refuseTakenSlug = useSlugConflict({ controlId: "lesson-slug", message: "lessonSlugTaken" })
  const [isOpen, setOpen] = useState(false)
  const [recording, setRecording] = useState<File>()

  const { holders } = useCourseAccessNames()

  const changeOpen = (open: boolean): void => {
    setOpen(open)
    setRecording(undefined)
  }
  const onSuccess = async ({ id }: { id: string }, { format }: Lesson["createLesson"]): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    const uploading = format === LESSON_FORMAT.VIDEO && recording !== undefined
    if (uploading) {
      void uploadLessonVideo({ file: recording, lessonId: id, queryClient })
    }
    toast.success(t(uploading ? "savedUploading" : "saved"))
    changeOpen(false)
  }
  const create = useMutation({ ...createLessonMutation, onSuccess })

  const form = useForm({
    defaultValues: NEW_LESSON,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      create.mutate({ ...value, chapterId }, { onError: refuseTakenSlug(formApi) })
    },
    validators: { onChange: lessonFormSchema },
  })

  const languages = useFormLocale(form, ({ summary, title }) => ({ texts: { summary, title } }))

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={changeOpen}>
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

            <div className="grid gap-4 @lg/field-group:grid-cols-2 @3xl/field-group:grid-cols-3">
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
              <form.Field name="format">
                {(field) => (
                  <CourseOptionField label={t("format")} onChange={field.handleChange} options={LESSON_FORMATS} value={field.state.value}>
                    {(format) => t(`formats.${format}`)}
                  </CourseOptionField>
                )}
              </form.Field>
            </div>
            <form.Subscribe selector={(state) => state.values.format}>
              {(format) => format === LESSON_FORMAT.VIDEO && <RecordingField onChange={setRecording} recording={recording} />}
            </form.Subscribe>
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
