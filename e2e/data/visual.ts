import type { SupportedLocale } from "../../src/integrations/use-intl/i18n.config"

export const VISUAL_PROJECT = "visual"

export const VISUAL_BROWSER_VARIABLE = "PLAYWRIGHT_VISUAL_BROWSER"

export const VISUAL_SPECS = /visual-[\w-]+\.spec\.ts$/u

export const VISUAL_SNAPSHOT_PATH = "{testDir}/__screenshots__/{testFileName}/{arg}{ext}"

export const VISUAL_MAX_DIFF_PIXEL_RATIO = 0.0002

export const VISUAL_COLOR_SCHEME = "dark"

export const VISUAL_TIMEZONE = "UTC"

export const VISUAL_VIEWPORTS = {
  DESKTOP: { height: 900, width: 1440 },
  PHONE: { height: 844, width: 390 },
} as const

export type VisualViewport = (typeof VISUAL_VIEWPORTS)[keyof typeof VISUAL_VIEWPORTS]

export const VISUAL_LOCALES = ["en-US", "de-DE", "pl-PL"] as const satisfies readonly SupportedLocale[]

export type VisualLocale = (typeof VISUAL_LOCALES)[number]

const [ENGLISH, LONGEST_WORDS_LOCALE] = VISUAL_LOCALES

export const COPY_MATRIX = VISUAL_LOCALES.flatMap((locale) => Object.values(VISUAL_VIEWPORTS).map((viewport) => ({ locale, viewport })))

export const APP_MATRIX = [
  { locale: ENGLISH, viewport: VISUAL_VIEWPORTS.DESKTOP },
  { locale: ENGLISH, viewport: VISUAL_VIEWPORTS.PHONE },
  { locale: LONGEST_WORDS_LOCALE, viewport: VISUAL_VIEWPORTS.DESKTOP },
] as const satisfies readonly { locale: VisualLocale; viewport: VisualViewport }[]

export const BLOG_CARD_MATRIX = [
  { locale: ENGLISH, viewport: VISUAL_VIEWPORTS.DESKTOP },
  ...VISUAL_LOCALES.map((locale) => ({ locale, viewport: VISUAL_VIEWPORTS.PHONE })),
] as const satisfies readonly { locale: VisualLocale; viewport: VisualViewport }[]

export const visualName = (target: string, { locale, viewport }: { locale: VisualLocale; viewport: VisualViewport }): string =>
  `${target}-${locale}-${String(viewport.width)}.png`
