import { MONO } from "../fonts"
import { THEME } from "../theme"
import { Camera } from "./course-ui"

const FILE = "src/modules/course/use-cases/get-catalogue.ts"

const TREE = [
  { depth: 0, name: "course/" },
  { depth: 1, name: "course.constants.ts" },
  { depth: 1, name: "course.schema.ts" },
  { depth: 1, name: "course.types.ts" },
  { depth: 1, name: "course.zod.ts" },
  { depth: 1, name: "use-cases/" },
  { depth: 2, name: "get-catalogue.ts" },
  { depth: 2, name: "get-course.ts" },
  { depth: 0, name: "lesson/" },
  { depth: 0, name: "video/" },
] as const

const ACTIVE_FILE = "get-catalogue.ts"

export const CODE = [
  'export const getCatalogue = createServerFn({ method: "GET" })',
  "  .middleware([withRequest])",
  '  .validator((input: Course["getCatalogue"]) => courseZodSchemas.getCatalogue.parse(input))',
  "  .handler(async ({ data: { locale } }) => {",
  "    const rows = await db",
  "      .select({",
  "        durationMs: sql<number>`coalesce(sum(${video.durationMs}), 0)`,",
  "        id: course.id,",
  "        kind: course.kind,",
  "        lessons: count(lesson.id),",
] as const

const KEYWORDS = new Set(["async", "await", "const", "export"])
const TOKEN = /("[^"]*"|`[^`]*`|[A-Za-z_$][\w$]*|\s+|.)/gu

function tokenColor(token: string): string {
  if (KEYWORDS.has(token)) {
    return THEME.accent
  }
  if (token.startsWith('"') || token.startsWith("`")) {
    return THEME.series
  }
  if (/^[A-Za-z_$]/u.test(token)) {
    return THEME.foreground
  }
  return THEME.mutedForeground
}

function CodeLine({ text }: Readonly<{ text: string }>) {
  return (
    <div style={{ height: 19, whiteSpace: "pre" }}>
      {(text.match(TOKEN) ?? []).map((token, index) => (
        <span key={index} style={{ color: tokenColor(token) }}>
          {token}
        </span>
      ))}
    </div>
  )
}

function PauseIcon() {
  return (
    <svg fill={THEME.foreground} height={13} viewBox="0 0 24 24" width={13}>
      <rect height="16" rx="1.5" width="4.5" x="5.5" y="4" />
      <rect height="16" rx="1.5" width="4.5" x="14" y="4" />
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg fill="none" height={13} stroke={THEME.foreground} strokeLinecap="round" strokeWidth={2} viewBox="0 0 24 24" width={13}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}

interface CoursePlayerProps {
  readonly elapsed: string
  readonly progress: number
  readonly typed: number
}

export function CoursePlayer({ elapsed, progress, typed }: CoursePlayerProps) {
  let remaining = typed

  return (
    <div
      style={{
        backgroundColor: THEME.sidebar,
        border: `1px solid ${THEME.hairline}`,
        borderRadius: 12,
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          alignItems: "center",
          borderBottom: `1px solid ${THEME.hairline}`,
          color: THEME.mutedForeground,
          display: "flex",
          fontFamily: MONO,
          fontSize: 10,
          height: 28,
          paddingInline: 12,
        }}
      >
        {FILE}
      </div>
      <div style={{ display: "flex", height: "calc(100% - 28px)" }}>
        <div
          style={{ borderRight: `1px solid ${THEME.hairline}`, flexShrink: 0, fontFamily: MONO, fontSize: 10, paddingTop: 10, width: 148 }}
        >
          {TREE.map((entry) => (
            <div
              key={`${entry.depth}-${entry.name}`}
              style={{
                backgroundColor: entry.name === ACTIVE_FILE ? THEME.muted : "transparent",
                color: entry.name === ACTIVE_FILE ? THEME.foreground : THEME.mutedForeground,
                height: 19,
                lineHeight: "19px",
                paddingLeft: 12 + entry.depth * 12,
              }}
            >
              {entry.name}
            </div>
          ))}
        </div>
        <div style={{ flexGrow: 1, fontFamily: MONO, fontSize: 10.5, minWidth: 0, overflow: "hidden", paddingLeft: 14, paddingTop: 10 }}>
          {CODE.map((line) => {
            const shown = line.slice(0, Math.max(0, remaining))
            remaining -= line.length
            return <CodeLine key={line} text={shown} />
          })}
        </div>
      </div>

      <Camera />

      <div
        style={{
          alignItems: "center",
          background: `linear-gradient(to top, ${THEME.background}, transparent)`,
          bottom: 0,
          display: "flex",
          gap: 12,
          height: 38,
          left: 0,
          paddingInline: 14,
          position: "absolute",
          right: 0,
        }}
      >
        <PauseIcon />
        <span style={{ color: THEME.foreground, fontFamily: MONO, fontSize: 10.5 }}>{elapsed}</span>
        <div style={{ backgroundColor: THEME.hairlineLit, borderRadius: 2, flexGrow: 1, height: 3, position: "relative" }}>
          <div style={{ backgroundColor: THEME.accent, borderRadius: 2, height: 3, width: `${(progress * 100).toFixed(2)}%` }} />
        </div>
        <FullscreenIcon />
      </div>
    </div>
  )
}
