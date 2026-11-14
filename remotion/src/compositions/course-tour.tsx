import type { ReactNode } from "react"

import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion"

import { CODE, CoursePlayer } from "../components/course-player"
import {
  AUTHOR,
  AccentLabel,
  COURSE,
  Curriculum,
  LESSONS,
  Label,
  LockedPanel,
  Mark,
  PlayIcon,
  Portrait,
  PrimaryButton,
} from "../components/course-ui"
import { Plate } from "../components/plate"
import { MONO, SANS } from "../fonts"
import { FPS, THEME, WIDE, WIDE_DURATION } from "../theme"

const VIEW = { height: 540, width: 960 } as const
const ZOOM = WIDE.width / VIEW.width

const EASE = Easing.bezier(0.16, 1, 0.3, 1)
const STEP = Easing.bezier(0.4, 0, 0.2, 1)
const GLIDE = Easing.bezier(0.65, 0, 0.35, 1)
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const

const FADE = 0.4 * FPS
const FOCUS = 0.25 * FPS
const PRESS = 0.12 * FPS

const PORTRAIT_OUT = 3.4 * FPS
const CAPTION_OUT = 2.6 * FPS
const SCROLL_FROM = 5.4 * FPS
const SCROLL_TO = 6.8 * FPS
const ROW_FOCUS = 7.3 * FPS
const ROW_PRESS = 8.1 * FPS
const LESSON_IN = 8.5 * FPS
const TYPE_FROM = 9.1 * FPS
const TYPE_TO = 13.3 * FPS
const NEXT_FOCUS = 13.7 * FPS
const NEXT_PRESS = 14.4 * FPS
const LOCKED_IN = 14.7 * FPS
const BUTTON_FOCUS = 16.3 * FPS
const BUTTON_PRESS = 17.1 * FPS
const PORTRAIT_IN = 18.6 * FPS
const CAPTION_IN = 20.2 * FPS
const LAST_FRAME = WIDE_DURATION - 1

const COURSE_SCROLL = -318
const COURSE_PADDING = 52
const STICKY_TOP = 32
const PUSH_IN = 1.06
const OPEN_LESSON = 0
const LOCKED_LESSON = 2
const PROGRESS_START = 0.04
const PROGRESS_END = 0.36
const SECONDS_PAD = 2

const CODE_LENGTH = CODE.join("").length

const focusAt = (frame: number, from: number, until = LAST_FRAME): number =>
  interpolate(frame, [from, from + FOCUS, until, until + FOCUS], [0, 1, 1, 0], CLAMP)

const pressAt = (frame: number, at: number): number => interpolate(frame, [at, at + PRESS, at + 2 * PRESS], [0, 1, 0], CLAMP)

function View({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        height: VIEW.height,
        left: 0,
        overflow: "hidden",
        position: "absolute",
        scale: String(ZOOM),
        top: 0,
        transformOrigin: "0 0",
        width: VIEW.width,
      }}
    >
      {children}
    </div>
  )
}

function BackLink({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
      <svg
        fill="none"
        height={12}
        stroke={THEME.mutedForeground}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
        width={12}
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <Label>{children}</Label>
    </div>
  )
}

function Caption() {
  const frame = useCurrentFrame()

  return (
    <Interactive.Div
      name="Caption"
      style={{
        bottom: 84,
        left: 96,
        opacity: interpolate(frame, [CAPTION_OUT, CAPTION_OUT + FADE, CAPTION_IN, CAPTION_IN + 2 * FADE], [1, 0, 0, 1], {
          easing: STEP,
          ...CLAMP,
        }),
        position: "absolute",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
        <Mark size={30} />
        <span style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>SaaSy Land</span>
      </div>
      <div style={{ fontFamily: SANS, fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 18 }}>
        {AUTHOR.name}
      </div>
    </Interactive.Div>
  )
}

function portraitScale(frame: number): number {
  if (frame < PORTRAIT_IN) {
    return interpolate(frame, [0, PORTRAIT_OUT + FADE], [1, PUSH_IN], CLAMP)
  }

  return interpolate(frame, [PORTRAIT_IN, LAST_FRAME], [PUSH_IN, 1], { easing: EASE, ...CLAMP })
}

function PortraitLayer() {
  const frame = useCurrentFrame()
  const scale = portraitScale(frame)

  return (
    <Interactive.Div
      name="Portrait"
      style={{
        inset: 0,
        opacity: interpolate(frame, [PORTRAIT_OUT, PORTRAIT_OUT + FADE, PORTRAIT_IN, PORTRAIT_IN + FADE], [1, 0, 0, 1], {
          easing: STEP,
          ...CLAMP,
        }),
        overflow: "hidden",
        position: "absolute",
      }}
    >
      <Portrait scale={scale} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${THEME.background} 0%, transparent 46%), linear-gradient(to right, oklch(0.168 0.005 265 / 0.55) 0%, transparent 42%)`,
        }}
      />
      <Caption />
    </Interactive.Div>
  )
}

function CourseLayer() {
  const frame = useCurrentFrame()
  const focus = focusAt(frame, ROW_FOCUS)
  const scroll = interpolate(frame, [SCROLL_FROM, SCROLL_TO], [0, COURSE_SCROLL], { easing: GLIDE, ...CLAMP })

  return (
    <Interactive.Div
      name="Course page"
      style={{
        backgroundColor: THEME.background,
        inset: 0,
        opacity: interpolate(frame, [PORTRAIT_OUT - 1, PORTRAIT_OUT, LESSON_IN + FADE, LESSON_IN + FADE + 1], [0, 1, 1, 0], CLAMP),
        position: "absolute",
      }}
    >
      <View>
        <div
          style={{
            display: "grid",
            gap: 40,
            gridTemplateColumns: "1fr 270px",
            padding: `${COURSE_PADDING}px 64px`,
            translate: `0px ${scroll.toFixed(2)}px`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <BackLink>Courses</BackLink>
            <div style={{ marginTop: 28 }}>
              <AccentLabel>Course</AccentLabel>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 50, fontWeight: 600, letterSpacing: "-0.035em", marginTop: 14 }}>{COURSE.title}</div>
            <div style={{ color: THEME.mutedForeground, fontFamily: SANS, fontSize: 17, marginTop: 12 }}>{COURSE.summary}</div>
            <div style={{ display: "flex", marginTop: 28 }}>
              <PrimaryButton focus={0} press={0}>
                <PlayIcon color={THEME.background} size={12} />
                Start the course
              </PrimaryButton>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", marginTop: 56 }}>Curriculum</div>
            <div style={{ marginTop: 24, scale: String(1 - pressAt(frame, ROW_PRESS) * 0.005) }}>
              <Curriculum active={focus > 0 ? OPEN_LESSON : -1} compact={false} focus={(index) => (index === OPEN_LESSON ? focus : 0)} />
            </div>
          </div>
          <div
            style={{
              alignSelf: "flex-start",
              background: `radial-gradient(circle at 50% 0%, ${THEME.accentDim}, ${THEME.card} 70%)`,
              translate: `0px ${Math.max(0, STICKY_TOP - COURSE_PADDING - scroll).toFixed(2)}px`,
              border: `1px solid ${THEME.accentMuted}`,
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Every lesson comes with Complete
            </div>
            <div style={{ color: THEME.mutedForeground, fontFamily: SANS, fontSize: 13, lineHeight: 1.6, marginTop: 10 }}>
              Complete unlocks every lesson in every course here, and your progress is saved as you watch.
            </div>
            <div style={{ display: "flex", marginTop: 20 }}>
              <PrimaryButton focus={0} press={0}>
                Get Complete
              </PrimaryButton>
            </div>
          </div>
        </div>
      </View>
    </Interactive.Div>
  )
}

function LessonHeading({ access, opacity, title }: Readonly<{ access: string; opacity: number; title: string }>) {
  return (
    <div style={{ inset: 0, opacity, position: "absolute" }}>
      <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</div>
      <div style={{ marginTop: 10 }}>
        <AccentLabel>{access}</AccentLabel>
      </div>
    </div>
  )
}

function LessonLayer() {
  const frame = useCurrentFrame()
  const locked = interpolate(frame, [LOCKED_IN, LOCKED_IN + FADE], [0, 1], { easing: STEP, ...CLAMP })
  const seconds = Math.max(0, Math.floor((Math.min(frame, LOCKED_IN) - LESSON_IN) / FPS))

  return (
    <Interactive.Div
      name="Lesson page"
      style={{
        backgroundColor: THEME.background,
        inset: 0,
        opacity: interpolate(frame, [LESSON_IN, LESSON_IN + FADE, PORTRAIT_IN + FADE, PORTRAIT_IN + FADE + 1], [0, 1, 1, 0], {
          easing: STEP,
          ...CLAMP,
        }),
        position: "absolute",
      }}
    >
      <View>
        <div style={{ display: "grid", gap: 32, gridTemplateColumns: "1fr 250px", padding: "34px 48px" }}>
          <div>
            <div style={{ aspectRatio: "16 / 9", position: "relative" }}>
              <div style={{ inset: 0, opacity: 1 - locked, position: "absolute" }}>
                <CoursePlayer
                  elapsed={`0:${String(seconds).padStart(SECONDS_PAD, "0")}`}
                  progress={interpolate(frame, [LESSON_IN, LOCKED_IN], [PROGRESS_START, PROGRESS_END], CLAMP)}
                  typed={Math.round(interpolate(frame, [TYPE_FROM, TYPE_TO], [0, CODE_LENGTH], CLAMP))}
                />
              </div>
              <div style={{ inset: 0, opacity: locked, position: "absolute" }}>
                <LockedPanel focus={focusAt(frame, BUTTON_FOCUS)} press={pressAt(frame, BUTTON_PRESS)} />
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <BackLink>{COURSE.title}</BackLink>
            </div>
            <div style={{ height: 64, marginTop: 10, position: "relative" }}>
              <LessonHeading access="Free preview" opacity={1 - locked} title={LESSONS[OPEN_LESSON].title} />
              <LessonHeading access="Included with Complete" opacity={locked} title={LESSONS[LOCKED_LESSON].title} />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: SANS, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Course contents</div>
            <div style={{ marginTop: 16, scale: String(1 - pressAt(frame, NEXT_PRESS) * 0.004) }}>
              <Curriculum
                active={locked > 0.5 ? LOCKED_LESSON : OPEN_LESSON}
                compact
                focus={(index) => (index === LOCKED_LESSON ? focusAt(frame, NEXT_FOCUS, LOCKED_IN) : 0)}
              />
            </div>
          </div>
        </div>
      </View>
    </Interactive.Div>
  )
}

export function CourseTour() {
  return (
    <Plate ground={THEME.background} seam={false}>
      <AbsoluteFill style={{ fontFamily: MONO }}>
        <CourseLayer />
        <LessonLayer />
        <PortraitLayer />
      </AbsoluteFill>
    </Plate>
  )
}
