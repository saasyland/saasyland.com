import type { ComponentProps, JSX } from "react"

import { useHydrated } from "@tanstack/react-router"
import { I18nProvider } from "@videojs/react/i18n"
import { HlsVideo } from "@videojs/react/media/hls-video"
import { VideoSkin } from "@videojs/react/video"
import "@videojs/react/video/skin.css"
import { useLocale } from "use-intl/react"

import { POSTER_SMALL_WIDTH, POSTER_WIDTH } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { getLocaleName } from "~/src/data/locales"

import { cn } from "~/src/lib/cn"

interface VideoPlayerProps {
  readonly className?: string
  readonly onEnded?: () => void
  readonly onProgress?: (seconds: number) => void
  readonly playback: Video["playback"]
  readonly sizes: string
  readonly startAt?: number
}

export const VideoPlayer = ({ className, onEnded, onProgress, playback, sizes, startAt = 0 }: VideoPlayerProps): JSX.Element => {
  const locale = useLocale()
  const hydrated = useHydrated()

  const renderPoster = (props: ComponentProps<"img">): JSX.Element => (
    <img
      {...props}
      alt=""
      sizes={sizes}
      src={playback.poster}
      srcSet={`${playback.posterSmall} ${String(POSTER_SMALL_WIDTH)}w, ${playback.poster} ${String(POSTER_WIDTH)}w`}
    />
  )

  return (
    <I18nProvider locale={locale}>
      <VideoSkin
        className={cn(
          "aspect-video h-auto w-full overflow-hidden rounded-lg border border-border bg-black [--media-accent-color:var(--color-ring)] [--media-accent-text-color:var(--color-background)] [--media-border-radius:var(--radius-lg)] [--media-font-family:var(--font-sans)]",
          className,
        )}
        renderPoster={renderPoster}
      >
        {hydrated && (
          <HlsVideo
            className="absolute inset-0 size-full"
            onEnded={() => onEnded?.()}
            onLoadedMetadata={(event) => {
              event.currentTarget.currentTime = startAt
            }}
            onTimeUpdate={(event) => onProgress?.(event.currentTarget.currentTime)}
            playsInline
            preload="metadata"
            src={playback.src}
          >
            <track default kind="metadata" label="thumbnails" src={playback.storyboard} />
            {playback.captions.map((caption) => (
              <track
                default={caption.locale === locale}
                key={caption.locale}
                kind="captions"
                label={getLocaleName(caption.locale)}
                src={caption.src}
                srcLang={caption.locale}
              />
            ))}
          </HlsVideo>
        )}
      </VideoSkin>
    </I18nProvider>
  )
}
