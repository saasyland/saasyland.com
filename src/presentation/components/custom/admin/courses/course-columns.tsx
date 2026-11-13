import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_QUERY_KEYS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { deleteCourseMutation } from "~/src/modules/course/use-cases/delete-course"

import { useDateFormatter } from "~/src/hooks/use-date-formatter"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button, LinkButton } from "~/src/presentation/components/shadcn/button"

import { DataTableActionsHeader, type DataTableFeatures } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

type CourseRow = Course["listRow"]

type CourseHeaderId = "course" | "kind" | "lessons" | "status" | "updated"

const CourseHeader = ({ id }: { readonly id: CourseHeaderId }): string => {
  const t = useTranslations("pages.admin.courses.table.headers")

  return t(id)
}

const TitleCell = ({ row }: CellContext<DataTableFeatures, CourseRow, CourseRow["title"]>): JSX.Element => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate text-sm font-medium text-foreground">{localize(row.original.title, getCurrentLocale())}</span>
    <span className="truncate font-mono text-xs text-muted-foreground">/courses/{row.original.slug}</span>
  </div>
)

const KindCell = ({ getValue }: CellContext<DataTableFeatures, CourseRow, CourseRow["kind"]>): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form.kinds")

  return <span className="text-sm text-muted-foreground">{t(getValue())}</span>
}

const StatusCell = ({ getValue }: CellContext<DataTableFeatures, CourseRow, CourseRow["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form.statuses")
  const status = getValue()

  return (
    <Badge
      className={cn("px-2 py-1 text-[10px] font-medium", {
        [ADMIN_STATUS_BADGE_CLASSES.emerald]: status === COURSE_STATUS.PUBLISHED,
        [ADMIN_STATUS_BADGE_CLASSES.neutral]: status === COURSE_STATUS.DRAFT,
      })}
      variant="outline"
    >
      {t(status)}
    </Badge>
  )
}

const LessonsCell = ({ getValue }: CellContext<DataTableFeatures, CourseRow, number>): JSX.Element => (
  <span className="font-mono text-sm text-muted-foreground tabular-nums">{getValue()}</span>
)

const UpdatedCell = ({ getValue }: CellContext<DataTableFeatures, CourseRow, Date>): JSX.Element => {
  const { formatDate } = useDateFormatter({ day: "numeric", month: "short", year: "numeric" })

  return <span className="text-sm text-muted-foreground">{formatDate({ value: getValue() })}</span>
}

const ActionsCell = ({ row }: CellContext<DataTableFeatures, CourseRow>): JSX.Element => {
  const t = useTranslations("pages.admin.courses")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const title = localize(row.original.title, getCurrentLocale())

  const { isPending, mutate } = useMutation({
    ...deleteCourseMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("delete.success", { title }))
    },
  })

  return (
    <div className="flex justify-end gap-1">
      <LinkButton
        aria-label={t("actions.edit", { title })}
        className="size-8 text-muted-foreground"
        href={`${ROUTES.ADMIN_COURSES}/${row.original.id}`}
        size="icon"
        variant="ghost"
      >
        <Pencil aria-hidden className="size-4" />
      </LinkButton>
      <AlertDialogTrigger>
        <Button
          aria-label={t("actions.delete", { title })}
          className="size-8 text-muted-foreground hover:text-destructive"
          isDisabled={isPending}
          size="icon"
          variant="ghost"
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
        <AlertDialog>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("delete.body", { title })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                mutate({ courseId: row.original.id })
              }}
              variant="destructive"
            >
              {t("delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
      </AlertDialogTrigger>
    </div>
  )
}

const columnHelper = createColumnHelper<DataTableFeatures, CourseRow>()

export const courseColumns = columnHelper.columns([
  columnHelper.accessor("title", { cell: TitleCell, enableSorting: false, header: () => <CourseHeader id="course" /> }),
  columnHelper.accessor("kind", { cell: KindCell, enableSorting: false, header: () => <CourseHeader id="kind" /> }),
  columnHelper.accessor("status", { cell: StatusCell, enableSorting: false, header: () => <CourseHeader id="status" /> }),
  columnHelper.accessor("lessons", { cell: LessonsCell, enableSorting: false, header: () => <CourseHeader id="lessons" /> }),
  columnHelper.accessor("updatedAt", { cell: UpdatedCell, enableSorting: false, header: () => <CourseHeader id="updated" /> }),
  columnHelper.display({ cell: ActionsCell, header: DataTableActionsHeader, id: "actions" }),
])
