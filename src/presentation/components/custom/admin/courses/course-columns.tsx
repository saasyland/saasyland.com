import { type JSX, useMemo, useState } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { ExternalLink, Link2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { DATA_GRID_ALIGN, DATA_GRID_FILTER, DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"
import { localizeHref } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localize } from "~/src/modules/_core/utils/localized-text"
import { COURSE_KINDS, COURSE_STATUS, COURSE_STATUSES } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"

import { COURSE_COLUMN_SIZES } from "~/src/data/admin-courses"
import { COURSE_STATUS_BADGES } from "~/src/data/course-badges"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { DropdownMenuItem, DropdownMenuSeparator } from "~/src/presentation/components/shadcn/dropdown-menu"

import { DeleteCoursesDialog } from "~/src/presentation/components/custom/admin/courses/delete-courses-dialog"
import type { DataGridColumn } from "~/src/presentation/components/custom/data-grid"
import { RowMenu } from "~/src/presentation/components/custom/row-menu"

import * as ROUTES from "~/src/routes"

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

const PositionCell = ({ getValue }: CellContext<DataGridFeatures, CourseRow, number>): JSX.Element => (
  <span className="text-sm text-muted-foreground tabular-nums">{getValue()}</span>
)

export const CourseActions = ({ row }: { readonly row: CourseRow }): JSX.Element => {
  const t = useTranslations("pages.admin.courses.actions")
  const [isDeleting, setDeleting] = useState(false)
  const title = localize(row.title, getCurrentLocale())
  const path = `${ROUTES.COURSES}/${row.slug}`

  const copyLink = (): void => {
    const link = new URL(localizeHref({ href: path, locale: getCurrentLocale() }), globalThis.location.origin)
    navigator.clipboard.writeText(link.href).then(
      () => {
        toast.success(t("copied"))
      },
      () => {
        toast.error(t("copyFailed"))
      },
    )
  }

  return (
    <div className="flex justify-end">
      <RowMenu label={t("menu", { title })}>
        <DropdownMenuItem href={`${ROUTES.ADMIN_COURSES}/${row.id}`} textValue={t("edit")}>
          <Pencil aria-hidden />
          {t("edit")}
        </DropdownMenuItem>
        {row.status === COURSE_STATUS.PUBLISHED && (
          <DropdownMenuItem href={path} target="_blank" textValue={t("view")}>
            <ExternalLink aria-hidden />
            {t("view")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onAction={copyLink} textValue={t("copyLink")}>
          <Link2 aria-hidden />
          {t("copyLink")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onAction={() => {
            setDeleting(true)
          }}
          variant="destructive"
          textValue={t("delete")}
        >
          <Trash2 aria-hidden />
          {t("delete")}
        </DropdownMenuItem>
      </RowMenu>
      <DeleteCoursesDialog courses={[row]} isOpen={isDeleting} onOpenChange={setDeleting} />
    </div>
  )
}

const columnHelper = createColumnHelper<DataGridFeatures, CourseRow>()

export const useCourseColumns = (): DataGridColumn<CourseRow>[] => {
  const t = useTranslations("pages.admin.courses")

  return useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("position", {
          cell: PositionCell,
          enableResizing: false,
          enableSorting: false,
          header: t("table.headers.position"),
          meta: { align: DATA_GRID_ALIGN.END, pinned: DATA_GRID_PIN.START },
          minSize: COURSE_COLUMN_SIZES.position,
          size: COURSE_COLUMN_SIZES.position,
        }),
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
