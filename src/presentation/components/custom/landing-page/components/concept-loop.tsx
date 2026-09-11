import { type JSX, useCallback, useState } from "react"
import { preload } from "react-dom"

import { cn } from "~/src/lib/cn"

import appTourPoster640 from "~/src/presentation/assets/motion/app-tour-640.webp?url"
import appTourPoster800 from "~/src/presentation/assets/motion/app-tour-800.webp?url"
import appTourPoster1280 from "~/src/presentation/assets/motion/app-tour-1280.webp?url"
import appTourVideo from "~/src/presentation/assets/motion/app-tour.webm?url"
import appTourPoster from "~/src/presentation/assets/motion/app-tour.webp?url"
import costCurvePoster600 from "~/src/presentation/assets/motion/cost-curve-600.webp?url"
import costCurveVideo from "~/src/presentation/assets/motion/cost-curve.webm?url"
import costCurvePoster from "~/src/presentation/assets/motion/cost-curve.webp?url"
import coverageRunPoster600 from "~/src/presentation/assets/motion/coverage-run-600.webp?url"
import coverageRunVideo from "~/src/presentation/assets/motion/coverage-run.webm?url"
import coverageRunPoster from "~/src/presentation/assets/motion/coverage-run.webp?url"
import localeFormatPoster600 from "~/src/presentation/assets/motion/locale-format-600.webp?url"
import localeFormatVideo from "~/src/presentation/assets/motion/locale-format.webm?url"
import localeFormatPoster from "~/src/presentation/assets/motion/locale-format.webp?url"
import mergeGatePoster600 from "~/src/presentation/assets/motion/merge-gate-600.webp?url"
import mergeGateVideo from "~/src/presentation/assets/motion/merge-gate.webm?url"
import mergeGatePoster from "~/src/presentation/assets/motion/merge-gate.webp?url"
import pageDesignerPoster800 from "~/src/presentation/assets/motion/page-designer-800.webp?url"
import pageDesignerVideo from "~/src/presentation/assets/motion/page-designer.webm?url"
import pageDesignerPoster from "~/src/presentation/assets/motion/page-designer.webp?url"
import recordAuditPoster600 from "~/src/presentation/assets/motion/record-audit-600.webp?url"
import recordAuditVideo from "~/src/presentation/assets/motion/record-audit.webm?url"
import recordAuditPoster from "~/src/presentation/assets/motion/record-audit.webp?url"
import scaffoldCliPoster600 from "~/src/presentation/assets/motion/scaffold-cli-600.webp?url"
import scaffoldCliVideo from "~/src/presentation/assets/motion/scaffold-cli.webm?url"
import scaffoldCliPoster from "~/src/presentation/assets/motion/scaffold-cli.webp?url"

const PANEL_WIDTH = 1600
const PANEL_HEIGHT = 1000
const STRIP_WIDTH = 1200
const TERMINAL_HEIGHT = 520
const STRIP_HEIGHT = 440

const PANEL: readonly [number, number] = [PANEL_WIDTH, PANEL_HEIGHT]
const TERMINAL: readonly [number, number] = [STRIP_WIDTH, TERMINAL_HEIGHT]
const STRIP: readonly [number, number] = [STRIP_WIDTH, STRIP_HEIGHT]

const LOOPS = {
  "app-tour": {
    poster: appTourPoster,
    posterSrcSet: `${appTourPoster640} 640w, ${appTourPoster800} 800w, ${appTourPoster1280} 1280w, ${appTourPoster} 1600w`,
    size: PANEL,
    video: appTourVideo,
  },
  "cost-curve": {
    poster: costCurvePoster,
    posterSrcSet: `${costCurvePoster600} 600w, ${costCurvePoster} 1200w`,
    size: STRIP,
    video: costCurveVideo,
  },
  "coverage-run": {
    poster: coverageRunPoster,
    posterSrcSet: `${coverageRunPoster600} 600w, ${coverageRunPoster} 1200w`,
    size: TERMINAL,
    video: coverageRunVideo,
  },
  "locale-format": {
    poster: localeFormatPoster,
    posterSrcSet: `${localeFormatPoster600} 600w, ${localeFormatPoster} 1200w`,
    size: STRIP,
    video: localeFormatVideo,
  },
  "merge-gate": {
    poster: mergeGatePoster,
    posterSrcSet: `${mergeGatePoster600} 600w, ${mergeGatePoster} 1200w`,
    size: STRIP,
    video: mergeGateVideo,
  },
  "page-designer": {
    poster: pageDesignerPoster,
    posterSrcSet: `${pageDesignerPoster800} 800w, ${pageDesignerPoster} 1600w`,
    size: PANEL,
    video: pageDesignerVideo,
  },
  "record-audit": {
    poster: recordAuditPoster,
    posterSrcSet: `${recordAuditPoster600} 600w, ${recordAuditPoster} 1200w`,
    size: STRIP,
    video: recordAuditVideo,
  },
  "scaffold-cli": {
    poster: scaffoldCliPoster,
    posterSrcSet: `${scaffoldCliPoster600} 600w, ${scaffoldCliPoster} 1200w`,
    size: STRIP,
    video: scaffoldCliVideo,
  },
}

export type ConceptLoopName = keyof typeof LOOPS

const NO_OFFSET = 0
const VISIBLE_FRACTION = 0.25

const play = (video: HTMLVideoElement, offsetSeconds: number): void => {
  if (offsetSeconds > NO_OFFSET && video.currentTime === NO_OFFSET) {
    video.currentTime = offsetSeconds
  }
  video.play().catch(() => {})
}

interface ConceptLoopProps {
  readonly className?: string
  readonly label?: string
  readonly name: ConceptLoopName
  readonly offsetSeconds?: number
  readonly preloadMedia?: string
  readonly sizes: string
}

export const ConceptLoop = ({ className, label, name, offsetSeconds = NO_OFFSET, preloadMedia, sizes }: ConceptLoopProps): JSX.Element => {
  const [hasPlayed, setHasPlayed] = useState(false)
  const {
    poster,
    posterSrcSet,
    size: [width, height],
    video: source,
  } = LOOPS[name]

  if (preloadMedia !== undefined) {
    preload(poster, { as: "image", fetchPriority: "high", imageSizes: sizes, imageSrcSet: posterSrcSet, media: preloadMedia })
  }

  const observeVideo = useCallback(
    (video: HTMLVideoElement | null): (() => void) | undefined => {
      if (!video || globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting !== true) {
            video.pause()
            return
          }

          play(video, offsetSeconds)
        },
        { threshold: VISIBLE_FRACTION },
      )
      observer.observe(video)

      return () => {
        observer.disconnect()
      }
    },
    [offsetSeconds],
  )

  return (
    <div className={cn("relative block w-full", className)}>
      <video
        ref={observeVideo}
        aria-hidden={label === undefined ? true : undefined}
        aria-label={label}
        className="block h-auto w-full"
        disablePictureInPicture
        height={height}
        loop
        muted
        onError={() => {
          setHasPlayed(false)
        }}
        onPlaying={() => {
          setHasPlayed(true)
        }}
        playsInline
        preload="none"
        tabIndex={-1}
        width={width}
      >
        <source src={source} type="video/webm" />
      </video>
      <img
        alt=""
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 size-full", { invisible: hasPlayed })}
        decoding="async"
        height={height}
        loading="lazy"
        sizes={preloadMedia === undefined ? `auto, ${sizes}` : sizes}
        src={poster}
        srcSet={posterSrcSet}
        width={width}
      />
    </div>
  )
}
