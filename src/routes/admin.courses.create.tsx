import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AdminCourseCreatePending } from "~/src/presentation/components/custom/admin/content-pending"
import { CourseForm } from "~/src/presentation/components/custom/admin/courses/course-form"

import { ROUTES } from "~/src/routes"

const CourseCreatePage = (): JSX.Element => {
  const t = useTranslations("pages.admin.courses.create")

  return (
    <div className="flex w-full max-w-3xl animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <CourseForm />
    </div>
  )
}

const NAMESPACE = "pages.admin.courses.create"

export const Route = createFileRoute("/admin/courses/create")({
  component: CourseCreatePage,
  head: pageHead(ROUTES.ADMIN_COURSES_CREATE),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminCourseCreatePending,
  staticData: { namespaces: [NAMESPACE] },
})
