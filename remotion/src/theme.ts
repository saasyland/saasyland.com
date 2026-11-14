export const DARK_TOKENS = {
  background: "oklch(0.168 0.005 265)",
  card: "oklch(0.204 0.006 265)",
  "chart-2": "oklch(0.55 0.075 245)",
  destructive: "oklch(0.704 0.191 22.216)",
  foreground: "oklch(0.977 0.002 265)",
  muted: "oklch(0.246 0.007 265)",
  "muted-foreground": "oklch(0.715 0.012 265)",
  ring: "oklch(0.775 0.108 199)",
  sidebar: "oklch(0.152 0.005 265)",
} as const

const withAlpha = (color: string, alpha: number) => color.replace(")", ` / ${String(alpha)})`)

export const THEME = {
  accent: DARK_TOKENS.ring,
  accentDim: withAlpha(DARK_TOKENS.ring, 0.16),
  accentMuted: withAlpha(DARK_TOKENS.ring, 0.45),
  background: DARK_TOKENS.background,
  backgroundShade: withAlpha(DARK_TOKENS.background, 0.55),
  card: DARK_TOKENS.card,
  destructive: DARK_TOKENS.destructive,
  foreground: DARK_TOKENS.foreground,
  hairline: "oklch(0.28 0.006 265)",
  hairlineLit: "oklch(0.36 0.007 265)",
  muted: DARK_TOKENS.muted,
  mutedForeground: DARK_TOKENS["muted-foreground"],
  series: DARK_TOKENS["chart-2"],
  seriesDim: withAlpha(DARK_TOKENS["chart-2"], 0.22),
  sidebar: DARK_TOKENS.sidebar,
} as const

export const FPS = 60

export const SURFACE_DURATION = 10 * FPS

export const BAND_DURATION = 8 * FPS

export const TERMINAL_DURATION = 11 * FPS

export const WIDE_DURATION = 22 * FPS

export const SEAM = 0.4 * FPS

export const TYPE = {
  label: { fontSize: 30, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase" },
  mono: { fontSize: 28, fontWeight: 400, letterSpacing: "0.01em" },
  readout: { fontSize: 78, fontWeight: 600, letterSpacing: "-0.035em" },
  readoutSmall: { fontSize: 54, fontWeight: 600, letterSpacing: "-0.03em" },
} as const
