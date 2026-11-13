import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getVideosPageQuery, getVideosQuery } from "~/src/modules/video/use-cases/get-videos"

import { pageHead } from "~/src/lib/seo"

import { AdminVideosPending } from "~/src/presentation/components/custom/admin/content-pending"
import { PublishVideoCard } from "~/src/presentation/components/custom/admin/videos/publish-video-card"
import { videoColumns } from "~/src/presentation/components/custom/admin/videos/video-columns"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const VideosPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.videos")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <DataTable columns={videoColumns} options={{ query: ({ pageIndex, pageSize }) => getVideosPageQuery({ pageIndex, pageSize }) }} />

      <PublishVideoCard />
    </div>
  )
}

const NAMESPACE = "pages.admin.videos"

export const Route = createFileRoute("/admin/videos")({
  component: VideosPage,
  head: pageHead(ROUTES.ADMIN_VIDEOS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...getVideosQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminVideosPending,
  staticData: { namespaces: [NAMESPACE] },
})
