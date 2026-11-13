import { type JSX, Suspense, lazy } from "react"

import { useQuery } from "@tanstack/react-query"
import { Play } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { videoPlaybackQuery } from "~/src/modules/video/use-cases/get-video-playback"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const VideoPlayer = lazy(() =>
  import("~/src/presentation/components/custom/video-player").then((module) => ({ default: module.VideoPlayer })),
)

const PLAYER_SIZES = "(min-width: 64rem) 60rem, calc(100vw - 4rem)"

const PlayerPending = (): JSX.Element => <Skeleton className="aspect-video w-full rounded-lg" />

const VideoPreview = ({ title, videoId }: { readonly title: string; readonly videoId: string }): JSX.Element => {
  const { data } = useQuery(videoPlaybackQuery({ videoId }))

  if (data === undefined) {
    return <PlayerPending />
  }

  return (
    <Suspense fallback={<PlayerPending />}>
      <VideoPlayer playback={data} sizes={PLAYER_SIZES} title={title} />
    </Suspense>
  )
}

export const VideoPreviewButton = ({ title, videoId }: { readonly title: string; readonly videoId: string }): JSX.Element => {
  const t = useTranslations("pages.admin.videos")

  return (
    <DialogTrigger>
      <Button aria-label={t("actions.preview", { title })} className="size-8 text-muted-foreground" size="icon" variant="ghost">
        <Play aria-hidden className="size-4" />
      </Button>
      <Dialog className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="pr-8">{title}</DialogTitle>
        </DialogHeader>
        <VideoPreview title={title} videoId={videoId} />
      </Dialog>
    </DialogTrigger>
  )
}
