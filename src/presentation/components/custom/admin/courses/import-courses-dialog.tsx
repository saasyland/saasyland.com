import { type JSX, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileUp, Upload } from "lucide-react"
import { FileTrigger } from "react-aria-components"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import {
  COURSE_DOCUMENT_ENTITIES,
  COURSE_DOCUMENT_MEDIA_TYPE,
  COURSE_QUERY_KEYS,
  COURSE_VALIDATION_PARAMS,
} from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { importCoursesMutation } from "~/src/modules/course/use-cases/import-courses"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/src/presentation/components/shadcn/dialog"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "~/src/presentation/components/shadcn/field"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const importSchema = courseZodSchemas.importCourses.pick({ document: true, removeMissing: true })

const ACCEPTED_TYPES = [".json", COURSE_DOCUMENT_MEDIA_TYPE]

interface ImportValues {
  readonly document: string
  readonly removeMissing: boolean
}

const NEW_IMPORT: ImportValues = { document: "", removeMissing: false }

type ImportResult = Course["importResult"]

type ImportProblem = Extract<ImportResult, { problems: unknown }>["problems"][number]

type ImportPlan = Extract<ImportResult, { tallies: unknown }>

const ProblemItem = ({ problem }: { readonly problem: ImportProblem }): JSX.Element => {
  const t = useTranslations()
  const key = `course.validations.${problem.message}`
  const message = t.has(key) ? t(key, COURSE_VALIDATION_PARAMS[problem.message]) : t("course.validations.valueInvalid")

  if (problem.path === "") {
    return <li>{message}</li>
  }

  return (
    <li>
      <code className="font-mono text-xs">{problem.path}</code> {message}
    </li>
  )
}

const ImportProblems = ({ result }: { readonly result: Extract<ImportResult, { problems: unknown }> }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.transfer.plan")
  const hidden = result.problemCount - result.problems.length

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">
      <p className="font-medium text-destructive">{t("problems", { count: result.problemCount })}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
        {result.problems.map((problem) => (
          <ProblemItem key={`${problem.path}:${problem.message}`} problem={problem} />
        ))}
      </ul>
      {hidden > 0 && <p className="mt-2 text-muted-foreground">{t("moreProblems", { count: hidden })}</p>}
    </div>
  )
}

const ImportSummary = ({ plan }: { readonly plan: ImportPlan }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.transfer.plan")

  if (plan.changes === 0) {
    return <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">{t("noChanges")}</p>
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm" role="status">
      <p className="font-medium text-foreground">{t("title")}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {COURSE_DOCUMENT_ENTITIES.map((entity) => (
          <div className="contents" key={entity}>
            <dt className="font-medium text-foreground">{t(`entities.${entity}`)}</dt>
            <dd className="text-muted-foreground tabular-nums">{t("tally", { ...plan.tallies[entity] })}</dd>
          </div>
        ))}
      </dl>
      {plan.files > 0 && <p className="mt-3 text-destructive">{t("files", { count: plan.files })}</p>}
      {plan.warnings.length > 0 && (
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          {plan.warnings.map((warning) => (
            <li key={`${warning.course}/${warning.lesson}`}>{t("videoMissing", warning)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ImportResultPanel = ({ result }: { readonly result: ImportResult | undefined }): JSX.Element | undefined => {
  if (result === undefined) {
    return undefined
  }

  if ("problems" in result) {
    return <ImportProblems result={result} />
  }

  return <ImportSummary plan={result} />
}

const canImport = (result: ImportResult | undefined): boolean => result !== undefined && "changes" in result && result.changes > 0

const useImportCourses = ({ onImported }: { readonly onImported: () => void }) => {
  const t = useTranslations("pages.admin.courses.transfer.dialog")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const check = useMutation({ ...importCoursesMutation, onError })
  const apply = useMutation({
    ...importCoursesMutation,
    onError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("imported"))
      onImported()
    },
  })

  const form = useForm({
    defaultValues: NEW_IMPORT,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      check.mutate({ ...value, dryRun: true })
    },
    validators: { onChange: importSchema },
  })

  return { apply, check, form }
}

export const ImportCoursesDialog = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses.transfer")
  const [isOpen, setOpen] = useState(false)
  const [fileName, setFileName] = useState("")

  const { apply, check, form } = useImportCourses({
    onImported: () => {
      setOpen(false)
    },
  })

  const onOpenChange = (open: boolean): void => {
    setOpen(open)
    setFileName("")
    check.reset()
    form.reset()
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button className="h-9 gap-2" size="sm" variant="outline">
        <FileUp aria-hidden className="size-4" />
        {t("import")}
      </Button>
      <Dialog className="sm:max-w-xl">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            void submitForm(event, form)
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("dialog.files")}</p>
          <FieldGroup>
            <form.Field name="document">
              {(field) => (
                <Field data-invalid={isFieldInvalid(field)}>
                  <FieldLabel>{t("dialog.file")}</FieldLabel>
                  <div className="flex flex-wrap items-center gap-3">
                    <FileTrigger
                      acceptedFileTypes={ACCEPTED_TYPES}
                      onSelect={(files) => {
                        const file = files?.[0]
                        if (file !== undefined) {
                          check.reset()
                          setFileName(file.name)
                          void file.text().then((text) => {
                            field.handleChange(text)
                            field.handleBlur()
                          })
                        }
                      }}
                    >
                      <Button
                        aria-describedby="import-courses-document-error"
                        aria-invalid={isFieldInvalid(field)}
                        size="sm"
                        variant="outline"
                      >
                        <Upload aria-hidden className="size-4" />
                        {t("dialog.chooseFile")}
                      </Button>
                    </FileTrigger>
                    {fileName !== "" && <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{fileName}</span>}
                  </div>
                  <FieldDescription>{t("dialog.fileHint")}</FieldDescription>
                  {isFieldInvalid(field) && (
                    <ValidationFieldError
                      id="import-courses-document-error"
                      message={fieldErrorMessage(field.state.meta.errors)}
                      namespace="course.validations"
                      params={COURSE_VALIDATION_PARAMS}
                    />
                  )}
                </Field>
              )}
            </form.Field>
            <form.Field name="removeMissing">
              {(field) => (
                <Field orientation="horizontal">
                  <Checkbox
                    aria-describedby="import-remove-missing-hint"
                    aria-labelledby="import-remove-missing-label"
                    isSelected={field.state.value}
                    onChange={(isSelected) => {
                      check.reset()
                      field.handleChange(isSelected)
                    }}
                  />
                  <FieldContent>
                    <FieldTitle id="import-remove-missing-label">{t("dialog.removeMissing")}</FieldTitle>
                    <FieldDescription id="import-remove-missing-hint">{t("dialog.removeMissingHint")}</FieldDescription>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <ImportResultPanel result={check.data} />
          <DialogFooter>
            <Button isPending={check.isPending} type="submit" variant="outline">
              {t("dialog.check")}
            </Button>
            <Button
              isDisabled={!canImport(check.data)}
              isPending={apply.isPending}
              onPress={() => {
                apply.mutate({ ...form.state.values, dryRun: false })
              }}
            >
              {t("dialog.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DialogTrigger>
  )
}
