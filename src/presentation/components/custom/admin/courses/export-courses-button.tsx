import type { JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { COURSE_DOCUMENT_MEDIA_TYPE } from "~/src/modules/course/course.constants"
import { exportCoursesMutation } from "~/src/modules/course/use-cases/export-courses"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { downloadFile } from "~/src/lib/download"

import { Button } from "~/src/presentation/components/shadcn/button"

const JSON_INDENT = 2
const DATE_LENGTH = 10

interface ExportCoursesButtonProps {
  readonly course?: { readonly id: string; readonly slug: string }
}

export const ExportCoursesButton = ({ course }: ExportCoursesButtonProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.transfer")
  const errorMessage = useErrorMessage()

  const { isPending, mutate } = useMutation({
    ...exportCoursesMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: (document) => {
      const fileName = `${course?.slug ?? "courses"}-${new Date().toISOString().slice(0, DATE_LENGTH)}.json`
      downloadFile({ content: `${JSON.stringify(document, undefined, JSON_INDENT)}\n`, fileName, type: COURSE_DOCUMENT_MEDIA_TYPE })
      toast.success(t("exported", { fileName }))
    },
  })

  return (
    <Button
      className="h-9 gap-2"
      isPending={isPending}
      onPress={() => {
        mutate(course === undefined ? {} : { courseId: course.id })
      }}
      size="sm"
      variant="outline"
    >
      <Download aria-hidden className="size-4" />
      {t(course === undefined ? "exportAll" : "export")}
    </Button>
  )
}
