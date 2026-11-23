import { type JSX, useMemo } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_KINDS, COURSE_QUERY_KEYS, COURSE_STATUSES } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { deleteCourseMutation } from "~/src/modules/course/use-cases/delete-course"
import { moveCourseMutation } from "~/src/modules/course/use-cases/move-course"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { COURSE_COLUMN_SIZES } from "~/src/data/admin-courses"
import { COURSE_STATUS_BADGES } from "~/src/data/course-badges"

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

import { MoveButtons } from "~/src/presentation/components/custom/admin/courses/move-buttons"
import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"

type CourseRow = Course["listRow"]

export const COURSE_GRID_ID = "courses"

const TitleCell = ({ row }: CellContext<DataGridFeatures, CourseRow, CourseRow["title"]>): JSX.Element => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate text-sm font-medium text-foreground">{localize(row.original.title, getCurrentLocale())}</span>
    <span className="truncate font-mono text-spec text-muted-foreground">/courses/{row.original.slug}</span>
  </div>
)

const KindCell = ({ getValue }: CellContext<DataGridFeatures, CourseRow, CourseRow["kind"]>): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form.kinds")

  return <span className="text-sm text-muted-foreground">{t(getValue())}</span>
}

const StatusCell = ({ getValue }: CellContext<DataGridFeatures, CourseRow, CourseRow["status"]>): JSX.Element => {
  const t = useTranslations("pages.admin.courses.form.statuses")

  return <Badge variant={COURSE_STATUS_BADGES[getValue()]}>{t(getValue())}</Badge>
}

const LessonsCell = ({ getValue }: CellContext<DataGridFeatures, CourseRow, number>): JSX.Element => (
  <span className="text-sm text-muted-foreground tabular-nums">{getValue()}</span>
)

const UpdatedCell = ({ getValue }: CellContext<DataGridFeatures, CourseRow, Date>): JSX.Element => {
  const format = useFormatter()

  return <span className="text-sm text-muted-foreground">{format.dateTime(getValue(), "date")}</span>
}

export const CourseActions = ({ row }: { readonly row: CourseRow }): JSX.Element => {
  const t = useTranslations("pages.admin.courses")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const title = localize(row.title, getCurrentLocale())

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const move = useMutation({
    ...moveCourseMutation,
    onError,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL }),
  })
  const { isPending, mutate } = useMutation({
    ...deleteCourseMutation,
    onError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.ALL })
      toast.success(t("delete.success", { title }))
    },
  })

  return (
    <div className="flex justify-end gap-1">
      <MoveButtons
        isFirst={row.isFirst}
        isLast={row.isLast}
        name={title}
        onMove={(direction) => {
          move.mutate({ courseId: row.id, direction })
        }}
      />
      <LinkButton
        aria-label={t("actions.edit", { title })}
        className="size-8 text-muted-foreground"
        params={{ courseId: row.id }}
        size="icon"
        to="/admin/courses/$courseId"
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
                mutate({ courseId: row.id })
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

const columnHelper = createColumnHelper<DataGridFeatures, CourseRow>()

export const useCourseColumns = (): DataGridColumn<CourseRow>[] => {
  const t = useTranslations("pages.admin.courses")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("title", {
          cell: TitleCell,
          enableSorting: false,
          header: t("table.headers.course"),
          id: "course",
          meta: {
            export: ({ slug, title }) => `${localize(title, getCurrentLocale())} (/courses/${slug})`,
            filter: { kind: DATA_GRID_FILTER.TEXT },
            pinned: DATA_GRID_PIN.START,
          },
          size: COURSE_COLUMN_SIZES.course,
        }),
        columnHelper.accessor("kind", {
          cell: KindCell,
          header: t("table.headers.kind"),
          meta: {
            export: ({ kind }) => t(`form.kinds.${kind}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: COURSE_KINDS.map((value) => ({ label: t(`form.kinds.${value}`), value })),
            },
          },
          size: COURSE_COLUMN_SIZES.kind,
        }),
        columnHelper.accessor("status", {
          cell: StatusCell,
          header: t("table.headers.status"),
          meta: {
            export: ({ status }) => t(`form.statuses.${status}`),
            filter: {
              kind: DATA_GRID_FILTER.MULTI_SELECT,
              options: COURSE_STATUSES.map((value) => ({ label: t(`form.statuses.${value}`), value })),
            },
          },
          size: COURSE_COLUMN_SIZES.status,
        }),
        columnHelper.accessor("lessons", {
          cell: LessonsCell,
          header: t("table.headers.lessons"),
          meta: { align: DATA_GRID_ALIGN.END, filter: { kind: DATA_GRID_FILTER.NUMBER_RANGE } },
          size: COURSE_COLUMN_SIZES.lessons,
        }),
        columnHelper.accessor("updatedAt", {
          cell: UpdatedCell,
          header: t("table.headers.updated"),
          meta: { filter: { kind: DATA_GRID_FILTER.DATE_RANGE } },
          size: COURSE_COLUMN_SIZES.updatedAt,
        }),
      ]),
    [t],
  )
}
