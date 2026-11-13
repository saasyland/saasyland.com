import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getCoursesPageQuery, getCoursesQuery } from "~/src/modules/course/use-cases/get-courses"

import { pageHead } from "~/src/lib/seo"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AdminCoursesPending } from "~/src/presentation/components/custom/admin/content-pending"
import { courseColumns } from "~/src/presentation/components/custom/admin/courses/course-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const CoursesPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <LinkButton className="h-9 gap-2" href={ROUTES.ADMIN_COURSES_CREATE} size="sm">
          <PlusCircle aria-hidden className="size-4" />
          {t("actions.create")}
        </LinkButton>
      </div>

      <DataTable columns={courseColumns} options={{ query: ({ pageIndex, pageSize }) => getCoursesPageQuery({ pageIndex, pageSize }) }} />
    </div>
  )
}

const NAMESPACE = "pages.admin.courses"

export const Route = createFileRoute("/admin/courses/")({
  component: CoursesPage,
  head: pageHead(ROUTES.ADMIN_COURSES),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getCoursesQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminCoursesPending,
  staticData: { namespaces: [NAMESPACE] },
})
