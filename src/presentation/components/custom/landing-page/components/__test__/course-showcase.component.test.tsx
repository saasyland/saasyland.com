import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { COURSE_ACCESS_TEST_MESSAGES, COURSE_ACCESS_TEST_NAMES } from "~/src/modules/course/__test__/fixtures/course-access.messages"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { CourseShowcase } from "~/src/presentation/components/custom/landing-page/components/course-showcase"

import english from "~/messages/en-US/pages.landing.json"

type ShowcaseCourse = Course["showcase"][number]

const copy = english.studio.masterclass

const loadShowcase = vi.hoisted(() => vi.fn<() => Promise<Course["showcase"]>>())

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

vi.mock(import("~/src/modules/course/use-cases/get-course-showcase"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    courseShowcaseQuery: (input: Course["getCourseShowcase"]) => ({ ...actual.courseShowcaseQuery(input), queryFn: loadShowcase }),
  }
})

type Notify = (entries: { isIntersecting: boolean; target: Element }[]) => void

const observers: { callback: Notify; elements: Element[] }[] = []

class TestIntersectionObserver {
  readonly #entry: { callback: Notify; elements: Element[] }

  constructor(callback: Notify) {
    this.#entry = { callback, elements: [] }
    observers.push(this.#entry)
  }

  observe(element: Element): void {
    this.#entry.elements.push(element)
  }

  unobserve(element: Element): void {
    this.#entry.elements = this.#entry.elements.filter((observed) => observed !== element)
  }

  disconnect(): void {
    this.#entry.elements = []
  }
}

const approach = (): void => {
  act(() => {
    for (const { callback, elements } of observers) {
      callback(elements.map((target) => ({ isIntersecting: true, target })))
    }
  })
}

const WALKTHROUGH: ShowcaseCourse = {
  durationMs: 1_500_000,
  icon: COURSE_ICON.MAP,
  id: "walkthrough",
  kind: COURSE_KIND.COURSE,
  lessonCount: 8,
  lessons: [
    { access: LESSON_ACCESS.PREVIEW, locked: false, recording: false, slug: "boundaries", title: "Lesson boundaries" },
    { access: LESSON_ACCESS.ACCOUNT, locked: true, recording: false, slug: "sessions", title: "Sessions" },
    { access: LESSON_ACCESS.PAID, locked: true, recording: true, slug: "billing", title: "Billing" },
  ],
  level: COURSE_LEVEL.BEGINNER,
  recordedCount: 6,
  slug: "code-walkthrough",
  title: "The walkthrough",
}

const TUTORIAL: ShowcaseCourse = {
  durationMs: 0,
  icon: COURSE_ICON.BOOK_OPEN,
  id: "tutorial",
  kind: COURSE_KIND.TUTORIAL,
  lessonCount: 0,
  lessons: [],
  level: COURSE_LEVEL.ADVANCED,
  recordedCount: 0,
  slug: "one-off",
  title: "One-off tutorial",
}

const UNRECORDED: ShowcaseCourse = {
  durationMs: 0,
  icon: COURSE_ICON.ROCKET,
  id: "project",
  kind: COURSE_KIND.PROJECT,
  lessonCount: 2,
  lessons: [
    { access: LESSON_ACCESS.PREVIEW, locked: false, recording: true, slug: "intro", title: "Intro" },
    { access: LESSON_ACCESS.PAID, locked: false, recording: false, slug: "deep-dive", title: "Deep dive" },
  ],
  level: COURSE_LEVEL.INTERMEDIATE,
  recordedCount: 0,
  slug: "unrecorded",
  title: "Unrecorded project",
}

const RECORDED: ShowcaseCourse = {
  ...UNRECORDED,
  durationMs: 540_000,
  id: "recorded",
  recordedCount: 2,
  slug: "recorded",
  title: "Recorded project",
}

const SKELETONS_PER_COURSE = 5 + COURSE_SHOWCASE.LESSONS * 3

const renderShowcase = () =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={{ ...getTestMessages("en-US"), ...COURSE_ACCESS_TEST_MESSAGES }} timeZone="UTC">
      <CourseShowcase />
    </IntlProvider>,
  )

const showcaseLoaded = async (): Promise<void> => {
  approach()
  await waitFor(() => {
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "false")
  })
}

const expectCourseFrame = (message: string): void => {
  const text = screen.getByText(message)
  const frame = text.previousElementSibling

  expect(frame).toHaveClass("invisible")
  expect(frame).toHaveAttribute("aria-hidden", "true")
  expect(frame?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(COURSE_SHOWCASE.COURSES * SKELETONS_PER_COURSE)
}

const playButton = () => screen.getByRole("button", { name: copy.tour.play })

beforeEach(() => {
  observers.length = 0
  loadShowcase.mockReset().mockResolvedValue([WALKTHROUGH, TUTORIAL])
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("course showcase data", () => {
  it("renders the static block and one placeholder tile per course without asking for courses until it nears the viewport", () => {
    const { container } = renderShowcase()

    expect(screen.getByRole("heading", { level: 3, name: copy.title })).toBeVisible()
    expect(screen.getByText(copy.body)).toBeVisible()
    expect(screen.getByRole("link", { name: copy.browse })).toHaveAttribute("href", "/courses")
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "false")
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(COURSE_SHOWCASE.COURSES * SKELETONS_PER_COURSE)
    expect(container.querySelector('[aria-hidden="true"].invisible')).toBeNull()
    expect(loadShowcase).not.toHaveBeenCalled()
  })

  it("links every course and its first lessons, opening the free ones and greying out the locked ones", async () => {
    const { container } = renderShowcase()
    await showcaseLoaded()

    expect(loadShowcase).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: WALKTHROUGH.title })).toHaveAttribute("href", "/courses/code-walkthrough")
    expect(screen.getByRole("link", { name: TUTORIAL.title })).toHaveAttribute("href", "/courses/one-off")
    const preview = screen.getByRole("link", { name: `Lesson boundaries ${copy.access.preview}` })
    const account = screen.getByRole("link", { name: `Sessions ${copy.locked.account}` })
    expect(preview).toHaveAttribute("href", "/courses/code-walkthrough/boundaries")
    expect(account).toHaveAttribute("href", "/courses/code-walkthrough/sessions")
    expect(preview.querySelector(".lucide-play.fill-current")).not.toBeNull()
    expect(account.querySelector(".lucide-lock")).not.toBeNull()
    expect(within(account).getByText(copy.access.account)).toHaveAttribute("aria-hidden", "true")
    expect(within(account).queryByText(copy.access.preview)).toBeNull()
    expect(screen.queryByRole("link", { name: /Billing/u })).toBeNull()
    expect(screen.getByText("Billing").parentElement).toHaveTextContent(copy.locked.paid.replace("{offer}", COURSE_ACCESS_TEST_NAMES.offer))
    expect(screen.getByRole("link", { name: "+ 5 more lessons" })).toHaveAttribute("href", "/courses/code-walkthrough")
    expect(container.querySelector('img[src="/images/courses/code-walkthrough.webp"]')).toHaveAttribute("alt", "")
    expect(container.querySelector('[aria-hidden="true"].invisible [data-slot="skeleton"]')).not.toBeNull()
  })

  it("plays nothing from a lesson being recorded and links a recorded lesson the viewer can open", async () => {
    loadShowcase.mockResolvedValue([UNRECORDED])
    renderShowcase()
    await showcaseLoaded()

    expect(screen.queryByRole("link", { name: /Intro/u })).toBeNull()
    expect(screen.getByText("Intro").parentElement).toHaveTextContent(copy.recording)
    expect(screen.getByRole("link", { name: `Deep dive ${COURSE_ACCESS_TEST_NAMES.offer}` })).toHaveAttribute(
      "href",
      "/courses/unrecorded/deep-dive",
    )
  })

  it("says how much of each course is recorded and how many lessons it holds beyond the first ones", async () => {
    loadShowcase.mockResolvedValue([WALKTHROUGH, TUTORIAL, UNRECORDED, RECORDED])
    renderShowcase()
    await showcaseLoaded()

    expect(screen.getByText("Course · Beginner")).toBeVisible()
    expect(screen.getByText("Tutorial · Advanced")).toBeVisible()
    expect(screen.getByText("6 of 8 lessons recorded")).toBeVisible()
    expect(screen.getByText("25 min")).toBeVisible()
    expect(screen.getByText("+ 5 more lessons")).toBeVisible()
    expect(screen.getAllByText("2 lessons")).toHaveLength(2)
    expect(screen.getByText("9 min")).toBeVisible()
    expect(screen.getAllByText(/more lessons?$/u)).toHaveLength(1)
    expect(screen.getAllByText(copy.recording).length).toBeGreaterThan(1)
  })

  it("says in the frame of the course tiles when no course is published", async () => {
    loadShowcase.mockResolvedValue([])
    renderShowcase()
    await showcaseLoaded()

    expectCourseFrame(copy.empty)
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: copy.browse })).toHaveAttribute("href", "/courses")
  })

  it("points to the courses page in the same frame when the courses cannot be loaded", async () => {
    loadShowcase.mockRejectedValue(new Error("offline"))
    renderShowcase()
    approach()

    expect(await screen.findByText(copy.error)).toBeVisible()
    expectCourseFrame(copy.error)
    expect(screen.getByRole("link", { name: copy.browse })).toHaveAttribute("href", "/courses")
  })
})

describe("course tour", () => {
  it("shows the poster with responsive AVIF and WebP sources at the video's size and loads no video", () => {
    const { container } = renderShowcase()
    const poster = container.querySelector("picture img")
    const avif = container.querySelector('picture source[type="image/avif"]')

    expect(screen.queryByLabelText(copy.tour.label)).not.toBeInTheDocument()
    expect(poster).toHaveAttribute("width", "1600")
    expect(poster).toHaveAttribute("height", "900")
    expect(poster).toHaveAttribute("loading", "lazy")
    expect(poster?.getAttribute("srcset")).toMatch(/\.webp 800w, .+\.webp 1600w$/u)
    expect(avif?.getAttribute("srcset")).toMatch(/\.avif 800w, .+\.avif 1600w$/u)
    expect(avif).toHaveAttribute("sizes", poster?.getAttribute("sizes"))
  })

  it("plays in place with native controls and hides the poster once the first frame is on screen", async () => {
    const user = userEvent.setup({ delay: null })
    const focus = vi.spyOn(HTMLElement.prototype, "focus")
    const { container } = renderShowcase()

    await user.click(playButton())

    const video = screen.getByLabelText(copy.tour.label)
    expect(focus.mock.contexts).toContain(video)
    expect(video).toHaveAttribute("autoplay")
    expect(video).toHaveAttribute("controls")
    expect(video).toHaveProperty("muted", true)
    expect(video).toHaveAttribute("width", "1600")
    expect(video).toHaveAttribute("aria-describedby", "course-tour-body")
    expect(screen.getByText(copy.tour.body)).toHaveAttribute("id", "course-tour-body")
    expect([...video.querySelectorAll("source")].map((source) => source.getAttribute("type"))).toStrictEqual(["video/webm", "video/mp4"])
    expect(screen.queryByRole("button", { name: copy.tour.play })).not.toBeInTheDocument()
    expect(container.querySelector("picture")).not.toHaveClass("invisible")

    fireEvent.playing(video)

    expect(container.querySelector("picture")).toHaveClass("invisible")
  })

  it("stops the tour when the block leaves the page", async () => {
    const user = userEvent.setup({ delay: null })
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockReturnValue(undefined)
    const { unmount } = renderShowcase()

    await user.click(playButton())
    const video = screen.getByLabelText(copy.tour.label)
    unmount()

    expect(pause.mock.contexts).toStrictEqual([video])
  })
})
