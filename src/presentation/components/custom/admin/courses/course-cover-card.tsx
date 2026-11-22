import { type JSX, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ImageUp, Trash2 } from "lucide-react"
import { FileTrigger } from "react-aria-components"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS, COURSE_VALIDATION_PARAMS } from "~/src/modules/course/course.constants"
import {
  COURSE_COVER_MAX_MEGABYTES,
  COURSE_COVER_QUALITY,
  COURSE_COVER_SIZE,
  COURSE_COVER_SOURCE_TYPES,
  COURSE_COVER_STORED_TYPES,
  COVER_SIZES,
  coverFormData,
} from "~/src/modules/course/course.cover"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { removeCourseCoverMutation } from "~/src/modules/course/use-cases/remove-course-cover"
import { uploadCourseCoverMutation } from "~/src/modules/course/use-cases/upload-course-cover"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFileSize } from "~/src/hooks/use-file-size"

import { encodeImages } from "~/src/lib/image-encoding"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldDescription, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { CourseCover } from "~/src/presentation/components/custom/courses/course-cover"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const PREVIEW_SIZES = "28rem"
const SOURCE_EXTENSIONS = Object.keys(COURSE_COVER_SOURCE_TYPES)
const SOURCE_NAMES = SOURCE_EXTENSIONS.map((extension) => extension.toUpperCase())
const ACCEPTED_TYPES = [...SOURCE_EXTENSIONS.map((extension) => `.${extension}`), ...Object.values(COURSE_COVER_SOURCE_TYPES)]
const FILE_ERROR_ID = "course-cover-file-error"

interface CoverValues {
  readonly file: File | undefined
}

const NO_FILE: CoverValues = { file: undefined }

const encodeCover = (file: File) =>
  encodeImages({
    fallbackType: COURSE_COVER_STORED_TYPES.jpg,
    file,
    preferredType: COURSE_COVER_STORED_TYPES.webp,
    quality: COURSE_COVER_QUALITY,
    sizes: COVER_SIZES,
  })

const useCoverActions = (course: Course["select"]) => {
  const t = useTranslations("pages.admin.courses.cover")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isEncoding, setEncoding] = useState(false)

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const refresh = async (message: "removed" | "uploaded"): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
    toast.success(t(message))
  }
  const upload = useMutation({ ...uploadCourseCoverMutation, onError, onSuccess: () => refresh("uploaded") })
  const remove = useMutation({ ...removeCourseCoverMutation, onError, onSuccess: () => refresh("removed") })

  const form = useForm({
    defaultValues: NO_FILE,
    listeners: { onBlur: validateOnBlur },
    onSubmit: async ({ formApi, value }) => {
      const { file } = courseZodSchemas.courseCoverSource.parse(value)
      setEncoding(true)
      const variants = await encodeCover(file).catch(() => {})
      setEncoding(false)
      if (variants === undefined) {
        toast.error(t("unreadable"))
        return
      }
      upload.mutate(coverFormData({ courseId: course.id, variants }), {
        onSuccess: () => {
          formApi.reset()
        },
      })
    },
    validators: { onChange: courseZodSchemas.courseCoverSource },
  })

  return { form, isUploading: isEncoding || upload.isPending, remove }
}

export const CourseCoverCard = ({ course }: { readonly course: Course["select"] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.cover")
  const format = useFormatter()
  const fileSize = useFileSize()

  const { form, isUploading, remove } = useCoverActions(course)

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t("title")}</h2>
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CourseCover
            className="w-full rounded-md border border-border"
            course={{ cover: course.cover, icon: course.icon, title: localize(course.title, getCurrentLocale()) }}
            sizes={PREVIEW_SIZES}
          />
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
                    <Button aria-describedby={FILE_ERROR_ID} aria-invalid={isFieldInvalid(field)} size="sm" variant="outline">
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
                    height: String(COURSE_COVER_SIZE.height),
                    max: COURSE_COVER_MAX_MEGABYTES,
                    types: format.list(SOURCE_NAMES, { type: "disjunction" }),
                    width: String(COURSE_COVER_SIZE.width),
                  })}
                </FieldDescription>
                {isFieldInvalid(field) && (
                  <ValidationFieldError
                    id={FILE_ERROR_ID}
                    message={fieldErrorMessage(field.state.meta.errors)}
                    namespace="course.validations"
                    params={COURSE_VALIDATION_PARAMS}
                  />
                )}
              </Field>
            )}
          </form.Field>
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2">
          {course.cover !== null && (
            <Button
              isPending={remove.isPending}
              onPress={() => {
                remove.mutate({ courseId: course.id })
              }}
              size="sm"
              variant="outline"
            >
              <Trash2 aria-hidden className="size-4" />
              {t("remove")}
            </Button>
          )}
          <Button isPending={isUploading} size="sm" type="submit">
            {t(course.cover === null ? "upload" : "replace")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
