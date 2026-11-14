import { LANDING_VIDEO_SIZES, type LandingVideoId } from "../../src/data/landing-videos"

import type { ComponentType } from "react"

import { Composition } from "remotion"

import { AppTour } from "./compositions/app-tour"
import { CostCurve } from "./compositions/cost-curve"
import { CourseTour } from "./compositions/course-tour"
import { CoverageRun } from "./compositions/coverage-run"
import { LocaleFormat } from "./compositions/locale-format"
import { MergeGate } from "./compositions/merge-gate"
import { PageDesigner } from "./compositions/page-designer"
import { RecordAudit } from "./compositions/record-audit"
import { ScaffoldCli } from "./compositions/scaffold-cli"
import { BAND_DURATION, FPS, SURFACE_DURATION, TERMINAL_DURATION, WIDE_DURATION } from "./theme"

const COMPOSITIONS = {
  "app-tour": { component: AppTour, durationInFrames: SURFACE_DURATION },
  "cost-curve": { component: CostCurve, durationInFrames: BAND_DURATION },
  "merge-gate": { component: MergeGate, durationInFrames: BAND_DURATION },
  "locale-format": { component: LocaleFormat, durationInFrames: BAND_DURATION },
  "scaffold-cli": { component: ScaffoldCli, durationInFrames: BAND_DURATION },
  "page-designer": { component: PageDesigner, durationInFrames: SURFACE_DURATION },
  "record-audit": { component: RecordAudit, durationInFrames: BAND_DURATION },
  "coverage-run": { component: CoverageRun, durationInFrames: TERMINAL_DURATION },
  "course-tour": { component: CourseTour, durationInFrames: WIDE_DURATION },
} satisfies Record<LandingVideoId, { component: ComponentType; durationInFrames: number }>

const isComposition = (id: string): id is LandingVideoId => id in COMPOSITIONS

export const RemotionRoot = () => (
  <>
    {Object.keys(COMPOSITIONS)
      .filter(isComposition)
      .map((id) => (
        <Composition
          component={COMPOSITIONS[id].component}
          durationInFrames={COMPOSITIONS[id].durationInFrames}
          fps={FPS}
          height={LANDING_VIDEO_SIZES[id].height}
          id={id}
          key={id}
          width={LANDING_VIDEO_SIZES[id].width}
        />
      ))}
  </>
)
