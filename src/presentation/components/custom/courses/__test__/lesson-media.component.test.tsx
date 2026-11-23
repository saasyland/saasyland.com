import type { ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { MediaTextCue } from "@videojs/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS, LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"
import type { Video } from "~/src/modules/video/video.types"

import { KeyMoments } from "~/src/presentation/components/custom/courses/key-moments"
import { LessonMedia } from "~/src/presentation/components/custom/courses/lesson-media"
import { LessonTranscript } from "~/src/presentation/components/custom/courses/lesson-transcript"

import messages from "~/messages/en-US/pages.courses.json"

const player = vi.hoisted(() => ({ play: vi.fn<() => Promise<void>>(), seek: vi.fn<(seconds: number) => Promise<void>>() }))
const playerProps = vi.hoisted(() => new Map<"props", { readonly poster: unknown; readonly title: unknown }>())
const container = vi.hoisted(() => new Map<"element", HTMLElement>())
const cues = vi.hoisted(() => new Map<"active" | "all", MediaTextCue[]>())
const scrollIntoView = vi.hoisted(() => vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>())
const createTrack = vi.hoisted(() => vi.fn<(init: unknown) => undefined>())

vi.mock("@videojs/react/video", () => ({
  VideoPlayer: ({ children, poster, title }: { readonly children: ReactNode; readonly poster: unknown; readonly title: unknown }) => {
    playerProps.set("props", { poster, title })
    return children
  },
  usePlayer: () => player,
}))

vi.mock("@videojs/react", () => ({
  useActiveTextCues: () => cues.get("active") ?? [],
  useContainer: () => container.get("element"),
  useCreateTextTrack: createTrack,
  useTextCues: () => cues.get("all") ?? [],
}))

const COURSE_SLUG = "the-walkthrough"
const LESSON_SLUG = "boundaries"
const BASE = "/media/a.b/video"

const PLAYBACK: Video["playback"] = {
  captions: [
    { locale: "en-US", src: `${BASE}/captions/en-US.vtt` },
    { locale: "pl-PL", src: `${BASE}/captions/pl-PL.vtt` },
  ],
  poster: `${BASE}/poster.webp`,
  posterSmall: `${BASE}/poster-960.webp`,
  src: `${BASE}/master.m3u8`,
  storyboard: `${BASE}/storyboard.vtt`,
}

const LESSON: Course["pageLesson"] = {
  access: LESSON_ACCESS.PREVIEW,
  captioned: true,
  chapterId: "chapter",
  completed: false,
  durationMs: 125_000,
  format: LESSON_FORMAT.VIDEO,
  id: "lesson",
  locked: false,
  positionMs: 0,
  recording: false,
  slug: LESSON_SLUG,
  summary: "Start here.",
  title: "Boundaries",
}

const MOMENTS = [
  { label: "The modules folder", seconds: 75 },
  { label: "One table", seconds: 3725 },
]

const FIRST_CUE: MediaTextCue = { endTime: 1, id: "first", startTime: 0, text: "Every feature starts at a module." }
const SECOND_CUE: MediaTextCue = { endTime: 62, id: "second", startTime: 61, text: "Open the modules folder." }
const CUES = [FIRST_CUE, SECOND_CUE]

const render = (
  ui: ReactNode,
  { locale = "en-US", playback = PLAYBACK }: { locale?: SupportedLocale; playback?: Video["playback"] } = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: LESSON_SLUG }).queryKey, playback)

  return renderWithRouter(
    <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
      {ui}
    </IntlProvider>,
    { queryClient },
  )
}

beforeEach(() => {
  player.seek.mockResolvedValue()
  player.play.mockResolvedValue()
  const element = document.createElement("div")
  element.scrollIntoView = scrollIntoView
  container.set("element", element)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  playerProps.clear()
  container.clear()
  cues.clear()
})

describe("LessonMedia", () => {
  it("gives the player the lesson's title and the poster of a lesson that plays", () => {
    render(
      <LessonMedia courseSlug={COURSE_SLUG} lesson={LESSON}>
        <p>Lesson body</p>
      </LessonMedia>,
    )

    expect(screen.getByText("Lesson body")).toBeVisible()
    expect(playerProps.get("props")).toStrictEqual({ poster: PLAYBACK.poster, title: "Boundaries" })
  })

  it("asks for no stream when the lesson does not play", () => {
    render(
      <LessonMedia courseSlug="other" lesson={{ ...LESSON, locked: true }}>
        <p>Locked body</p>
      </LessonMedia>,
    )

    expect(playerProps.get("props")).toStrictEqual({ poster: undefined, title: "Boundaries" })
  })
})

describe("KeyMoments", () => {
  it("seeks to a key moment, plays from there and adds the moments as chapters", async () => {
    const user = userEvent.setup({ delay: null })
    render(<KeyMoments moments={MOMENTS} playable />)

    await user.click(screen.getByRole("button", { name: "1:02:05 One table" }))

    expect(screen.getByRole("heading", { level: 2, name: messages.lesson.keyMoments })).toBeVisible()
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" })
    expect(player.seek).toHaveBeenCalledWith(3725)
    await vi.waitFor(() => {
      expect(player.play).toHaveBeenCalledOnce()
    })
    expect(createTrack).toHaveBeenCalledWith({
      cues: [
        { startTime: 75, text: "The modules folder" },
        { startTime: 3725, text: "One table" },
      ],
      kind: "chapters",
    })
  })

  it("seeks even before the player's frame has mounted", async () => {
    const user = userEvent.setup({ delay: null })
    container.clear()
    render(<KeyMoments moments={MOMENTS} playable />)

    await user.click(screen.getByRole("button", { name: "1:15 The modules folder" }))

    expect(player.seek).toHaveBeenCalledWith(75)
  })

  it("lists the moments of a lesson that cannot play without seeking", () => {
    render(<KeyMoments moments={MOMENTS} playable={false} />)

    expect(screen.getByText("The modules folder")).toBeVisible()
    expect(screen.queryByRole("button")).toBeNull()
    expect(createTrack).not.toHaveBeenCalled()
  })

  it("says nothing about a lesson without key moments", () => {
    const { container: root } = render(<KeyMoments moments={[]} playable />)

    expect(root).toBeEmptyDOMElement()
  })
})

describe("LessonTranscript", () => {
  it("reads the captions in the page's language, marks the line playing now and seeks to a line", async () => {
    const user = userEvent.setup({ delay: null })
    cues.set("all", CUES)
    cues.set("active", [SECOND_CUE])
    render(<LessonTranscript courseSlug={COURSE_SLUG} lessonSlug={LESSON_SLUG} />, { locale: "pl-PL" })

    const transcript = screen.getByRole("list")
    expect(transcript).toHaveAttribute("lang", "pl-PL")
    expect(createTrack).toHaveBeenCalledWith({
      kind: "metadata",
      label: "transcript",
      language: "pl-PL",
      src: `${BASE}/captions/pl-PL.vtt`,
    })
    expect(screen.getByRole("button", { name: "1:01 Open the modules folder." })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "0:00 Every feature starts at a module." })).toHaveAttribute("aria-current", "false")

    await user.click(screen.getByRole("button", { name: "0:00 Every feature starts at a module." }))

    expect(player.seek).toHaveBeenCalledWith(0)
  })

  it("falls back to the English captions, then to the first ones", () => {
    cues.set("all", CUES)
    render(<LessonTranscript courseSlug={COURSE_SLUG} lessonSlug={LESSON_SLUG} />, { locale: "de-DE" })

    expect(createTrack).toHaveBeenLastCalledWith(expect.objectContaining({ language: "en-US" }))
    expect(screen.getAllByRole("button").every((button) => button.getAttribute("aria-current") === "false")).toBe(true)

    cleanup()
    render(<LessonTranscript courseSlug={COURSE_SLUG} lessonSlug={LESSON_SLUG} />, {
      locale: "de-DE",
      playback: { ...PLAYBACK, captions: PLAYBACK.captions.slice(1) },
    })

    expect(createTrack).toHaveBeenLastCalledWith(expect.objectContaining({ language: "pl-PL" }))
  })

  it("says nothing while the captions have no lines or the video has no captions", () => {
    const { container: root } = render(<LessonTranscript courseSlug={COURSE_SLUG} lessonSlug={LESSON_SLUG} />)

    expect(root).toBeEmptyDOMElement()

    cleanup()
    const { container: bare } = render(<LessonTranscript courseSlug={COURSE_SLUG} lessonSlug={LESSON_SLUG} />, {
      playback: { ...PLAYBACK, captions: [] },
    })

    expect(bare).toBeEmptyDOMElement()
    expect(screen.queryByRole("heading", { name: messages.lesson.transcript })).toBeNull()
  })
})
