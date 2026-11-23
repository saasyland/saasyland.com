import { type JSX, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { deleteCoursesMutation } from "~/src/modules/course/use-cases/delete-courses"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"

type CourseRow = Course["listRow"]

interface DeleteCoursesDialogProps {
  readonly courses: readonly CourseRow[]
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
}

export const DeleteCoursesDialog = ({ courses, isOpen, onOpenChange }: DeleteCoursesDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.delete")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const count = courses.length
  const title = courses.map((course) => localize(course.title, getCurrentLocale())).join(", ")

  const remove = useMutation({
    ...deleteCoursesMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async ({ ids }) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("success", { count: ids.length, title }))
    },
  })

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("title", { count })}</AlertDialogTitle>
        <AlertDialogDescription>{t("body", { count, title })}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("cancel", { count })}</AlertDialogCancel>
        <AlertDialogAction
          onPress={() => {
            remove.mutate({ courseIds: courses.map((course) => course.id) })
          }}
          variant="destructive"
        >
          {t("confirm", { count })}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialog>
  )
}

export const DeleteCoursesButton = ({ courses }: { readonly courses: readonly CourseRow[] }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.delete")
  const [isOpen, setOpen] = useState(false)

  return (
    <>
      <Button
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onPress={() => {
          setOpen(true)
        }}
        size="sm"
        variant="outline"
      >
        <Trash2 aria-hidden />
        {t("confirm", { count: courses.length })}
      </Button>
      <DeleteCoursesDialog courses={courses} isOpen={isOpen} onOpenChange={setOpen} />
    </>
  )
}
