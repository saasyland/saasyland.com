import type { CSSProperties, ReactNode } from "react"

import { Img, staticFile } from "remotion"

import { MONO, SANS } from "../fonts"
import { THEME } from "../theme"

export const ACCESS = {
  ACCOUNT: "account",
  PAID: "paid",
  PREVIEW: "preview",
} as const

type Access = (typeof ACCESS)[keyof typeof ACCESS]

interface Lesson {
  readonly access: Access
  readonly title: string
}

interface Chapter {
  readonly lessons: readonly Lesson[]
  readonly title: string
}

export const CHAPTERS: readonly Chapter[] = [
  {
    lessons: [
      { access: ACCESS.PREVIEW, title: "Architecture and module boundaries" },
      { access: ACCESS.ACCOUNT, title: "Authentication and session security" },
      { access: ACCESS.PAID, title: "Billing, webhooks and pricing models" },
    ],
    title: "Foundations",
  },
  {
    lessons: [
      { access: ACCESS.PAID, title: "Test strategy and the coverage gate" },
      { access: ACCESS.PAID, title: "Internationalization end to end" },
      { access: ACCESS.PAID, title: "Deployment, migrations and rollback" },
    ],
    title: "Shipping",
  },
]

export const LESSONS: readonly Lesson[] = CHAPTERS.flatMap((chapter) => chapter.lessons)

export const COURSE = {
  summary: "How the code you receive works, subsystem by subsystem.",
  title: "The walkthrough",
} as const

export const AUTHOR = {
  name: "Piotr Borowiecki",
  photo: staticFile("author.jpg"),
  photoHeight: 893,
  photoWidth: 1600,
} as const

const LABEL: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
}

export function Mark({ size }: Readonly<{ size: number }>) {
  return (
    <svg fill={THEME.foreground} height={size} viewBox="0 0 24 24" width={size}>
      <path d="M6 0H15V9H24V18A6 6 0 0 1 18 24H6A6 6 0 0 1 0 18V6A6 6 0 0 1 6 0Z" />
    </svg>
  )
}

function LockIcon({ color, size }: Readonly<{ color: string; size: number }>) {
  return (
    <svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.25}
      viewBox="0 0 24 24"
      width={size}
    >
      <rect height="11" rx="2" width="18" x="3" y="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function PlayIcon({ color, size }: Readonly<{ color: string; size: number }>) {
  return (
    <svg fill={color} height={size} viewBox="0 0 24 24" width={size}>
      <path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
    </svg>
  )
}

export function Label({ children, color = THEME.mutedForeground }: Readonly<{ children: ReactNode; color?: string }>) {
  return <div style={{ ...LABEL, color }}>{children}</div>
}

export function AccentLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 9 }}>
      <span style={{ backgroundColor: THEME.accent, borderRadius: 1.5, height: 5, width: 5 }} />
      <Label color={THEME.accent}>{children}</Label>
    </div>
  )
}

function PreviewBadge() {
  return (
    <span
      style={{
        ...LABEL,
        backgroundColor: THEME.accentDim,
        border: `1px solid ${THEME.accentMuted}`,
        borderRadius: 3,
        color: THEME.accent,
        fontSize: 9,
        marginLeft: 10,
        padding: "2px 6px",
      }}
    >
      Free preview
    </span>
  )
}

interface LessonRowProps {
  readonly access: Access
  readonly active: boolean
  readonly compact: boolean
  readonly focus: number
  readonly index: number
  readonly title: string
}

export function LessonRow({ access, active, compact, focus, index, title }: LessonRowProps) {
  const open = access === ACCESS.PREVIEW

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: active ? THEME.muted : "transparent",
        borderBottom: `1px solid ${THEME.hairline}`,
        borderRadius: active ? 6 : 0,
        display: "flex",
        gap: 14,
        height: compact ? 36 : 48,
        outline: `2px solid ${THEME.accent}`,
        outlineColor: `color-mix(in oklch, ${THEME.accent} ${Math.round(focus * 100)}%, transparent)`,
        outlineOffset: 2,
        paddingInline: active ? 8 : 0,
      }}
    >
      <span style={{ color: THEME.mutedForeground, fontFamily: MONO, fontSize: compact ? 11 : 13 }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        style={{
          color: active || open ? THEME.foreground : THEME.mutedForeground,
          flexGrow: 1,
          fontFamily: SANS,
          fontSize: compact ? 13 : 16,
          fontWeight: active ? 500 : 400,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
        {open && !compact ? <PreviewBadge /> : undefined}
      </span>
      {open ? (
        <PlayIcon color={THEME.accent} size={compact ? 11 : 13} />
      ) : (
        <LockIcon color={THEME.mutedForeground} size={compact ? 11 : 13} />
      )}
    </div>
  )
}

export function Curriculum({ active, compact, focus }: Readonly<{ active: number; compact: boolean; focus: (index: number) => number }>) {
  let row = 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 16 : 26 }}>
      {CHAPTERS.map((chapter) => (
        <div key={chapter.title}>
          <Label>{chapter.title}</Label>
          <div style={{ borderTop: `1px solid ${THEME.hairline}`, marginTop: 10 }}>
            {chapter.lessons.map((lesson) => {
              const index = row++
              return (
                <LessonRow
                  access={lesson.access}
                  active={index === active}
                  compact={compact}
                  focus={focus(index)}
                  index={index}
                  key={lesson.title}
                  title={lesson.title}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PrimaryButton({ children, focus, press }: Readonly<{ children: ReactNode; focus: number; press: number }>) {
  return (
    <div
      style={{
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: THEME.foreground,
        borderRadius: 10,
        color: THEME.background,
        display: "inline-flex",
        fontFamily: SANS,
        fontSize: 15,
        fontWeight: 600,
        gap: 10,
        height: 44,
        outline: `2px solid ${THEME.accent}`,
        outlineColor: `color-mix(in oklch, ${THEME.accent} ${Math.round(focus * 100)}%, transparent)`,
        outlineOffset: 3,
        paddingInline: 20,
        scale: String(1 - press * 0.03),
      }}
    >
      {children}
    </div>
  )
}

export function Portrait({ scale }: Readonly<{ scale: number }>) {
  return (
    <Img
      src={AUTHOR.photo}
      style={{
        height: "100%",
        inset: 0,
        objectFit: "cover",
        position: "absolute",
        scale: String(scale),
        transformOrigin: "62% 34%",
        width: "100%",
      }}
    />
  )
}

export function Camera() {
  return (
    <div
      style={{
        border: `1px solid ${THEME.hairlineLit}`,
        borderRadius: 10,
        bottom: 46,
        height: 92,
        overflow: "hidden",
        position: "absolute",
        right: 12,
        width: 122,
      }}
    >
      <Img src={AUTHOR.photo} style={{ left: -205, position: "absolute", top: -12, width: AUTHOR.photoWidth / 4 }} />
    </div>
  )
}

export function LockedPanel({ focus, press }: Readonly<{ focus: number; press: number }>) {
  return (
    <div
      style={{
        alignItems: "center",
        background: `radial-gradient(circle at 50% 40%, ${THEME.accentDim}, ${THEME.card} 70%)`,
        border: `1px solid ${THEME.hairline}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          alignItems: "center",
          backgroundColor: THEME.accentDim,
          border: `1px solid ${THEME.accentMuted}`,
          borderRadius: 999,
          display: "flex",
          height: 46,
          justifyContent: "center",
          width: 46,
        }}
      >
        <LockIcon color={THEME.accent} size={18} />
      </div>
      <div style={{ color: THEME.foreground, fontFamily: SANS, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 18 }}>
        This lesson comes with Complete
      </div>
      <div style={{ color: THEME.mutedForeground, fontFamily: SANS, fontSize: 14, lineHeight: 1.55, marginTop: 8, maxWidth: 380 }}>
        Complete unlocks every lesson in every course here, and your progress is saved as you watch.
      </div>
      <div style={{ marginTop: 22 }}>
        <PrimaryButton focus={focus} press={press}>
          Get Complete
        </PrimaryButton>
      </div>
    </div>
  )
}
