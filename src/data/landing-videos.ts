const BAND = { height: 440, width: 1200 } as const
const SURFACE = { height: 1000, width: 1600 } as const
const TERMINAL = { height: 520, width: 1200 } as const
const WIDE = { height: 900, width: 1600 } as const

export const LANDING_VIDEO_SIZES = {
  "app-tour": SURFACE,
  "cost-curve": BAND,
  "course-tour": WIDE,
  "coverage-run": TERMINAL,
  "locale-format": BAND,
  "merge-gate": BAND,
  "page-designer": SURFACE,
  "record-audit": BAND,
  "scaffold-cli": BAND,
} as const

export type LandingVideoId = keyof typeof LANDING_VIDEO_SIZES
