import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { COURSE_KIND, COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"

import { CourseShowcase } from "~/src/presentation/components/custom/landing-page/components/course-showcase"

import english from "~/messages/en-US/pages.landing.json"

type Showcase = Course["showcase"]
type ShowcaseCourse = Showcase["courses"][number]

const copy = english.studio.masterclass

const loadShowcase = vi.hoisted(() => vi.fn<() => Promise<Course["showcase"]>>())

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

const lesson = (slug: string, access: ShowcaseCourse["lessons"][number]["access"], durationMs: number | null = 125_000) => ({
  access,
  durationMs,
  id: `lesson-${slug}`,
  slug,
  title: `Lesson ${slug}`,
})

const WALKTHROUGH: ShowcaseCourse = {
  durationMs: 1_500_000,
  id: "walkthrough",
  kind: COURSE_KIND.COURSE,
  lessonCount: 8,
  lessons: [
    lesson("boundaries", LESSON_ACCESS.PREVIEW),
    lesson("sessions", LESSON_ACCESS.ACCOUNT),
    lesson("billing", LESSON_ACCESS.PAID),
    lesson("coverage", LESSON_ACCESS.PAID, null),
  ],
  previewCount: 1,
  slug: "the-walkthrough",
  title: "The walkthrough",
}

const TUTORIAL: ShowcaseCourse = {
  durationMs: 0,
  id: "tutorial",
  kind: COURSE_KIND.TUTORIAL,
  lessonCount: 0,
  lessons: [],
  previewCount: 0,
  slug: "one-off",
  title: "One-off tutorial",
}

const FULL: Showcase = {
  courses: [WALKTHROUGH, TUTORIAL],
  freeLesson: { courseSlug: "the-walkthrough", slug: "boundaries", title: "Lesson boundaries" },
}

const renderShowcase = () =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <CourseShowcase />
    </IntlProvider>,
  )

const showcaseLoaded = async (): Promise<void> => {
  approach()
  await waitFor(() => {
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "false")
  })
}

const playButton = () => screen.getByRole("button", { name: copy.tour.play })

beforeEach(() => {
  observers.length = 0
  loadShowcase.mockReset().mockResolvedValue(FULL)
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("course showcase data", () => {
  it("renders the static block and placeholders without asking for courses until it nears the viewport", () => {
    const { container } = renderShowcase()

    expect(screen.getByRole("heading", { level: 3, name: copy.title })).toBeVisible()
    expect(screen.getByText(copy.body)).toBeVisible()
    expect(screen.getByRole("link", { name: copy.browse })).toHaveAttribute("href", "/courses")
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "false")
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(COURSE_SHOWCASE.COURSES * (COURSE_SHOWCASE.LESSONS + 2))
    expect(loadShowcase).not.toHaveBeenCalled()
  })

  it("links every course and lesson to its page once the courses arrive", async () => {
    const { container } = renderShowcase()
    await showcaseLoaded()

    expect(loadShowcase).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: WALKTHROUGH.title })).toHaveAttribute("href", "/courses/the-walkthrough")
    expect(screen.getByRole("link", { name: TUTORIAL.title })).toHaveAttribute("href", "/courses/one-off")
    for (const entry of WALKTHROUGH.lessons) {
      expect(screen.getByRole("link", { name: new RegExp(`^${entry.title}`, "u") })).toHaveAttribute(
        "href",
        `/courses/the-walkthrough/${entry.slug}`,
      )
    }
    expect(screen.getByRole("link", { name: new RegExp(`^${copy.freeLesson}`, "u") })).toHaveAttribute(
      "href",
      "/courses/the-walkthrough/boundaries",
    )
    expect(screen.getByRole("link", { name: "All 8 lessons in The walkthrough" })).toHaveAttribute("href", "/courses/the-walkthrough")
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
    expect(container.querySelector(String.raw`.md\:grid-cols-2`)).toBeInTheDocument()
  })

  it("describes each course and marks how every lesson can be watched", async () => {
    renderShowcase()
    await showcaseLoaded()

    expect(screen.getByText("Course")).toBeVisible()
    expect(screen.getByText("8 lessons")).toBeVisible()
    expect(screen.getByText("25 min")).toBeVisible()
    expect(screen.getByText("1 free lesson")).toBeVisible()
    expect(screen.getByText("No free lessons")).toBeVisible()
    expect(screen.getByText(copy.noLessons)).toBeVisible()
    expect(screen.getAllByText("2:05")).toHaveLength(3)

    const preview = screen.getByRole("link", { name: /^Lesson boundaries/u })
    expect(within(preview).getByText(copy.access.preview)).toBeVisible()
    expect(screen.getByRole("link", { name: /^Lesson sessions/u })).toHaveTextContent(copy.access.account)
    expect(screen.getByRole("link", { name: /^Lesson billing/u })).toHaveTextContent(copy.access.paid)
  })

  it("keeps a single course on one column and leaves out links it cannot fill", async () => {
    loadShowcase.mockResolvedValue({ courses: [{ ...WALKTHROUGH, lessonCount: WALKTHROUGH.lessons.length }], freeLesson: undefined })
    const { container } = renderShowcase()
    await showcaseLoaded()

    expect(container.querySelector(String.raw`.md\:grid-cols-2`)).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: new RegExp(`^${copy.freeLesson}`, "u") })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /^All/u })).not.toBeInTheDocument()
  })

  it("says when no course is published", async () => {
    loadShowcase.mockResolvedValue({ courses: [], freeLesson: undefined })
    renderShowcase()
    await showcaseLoaded()

    expect(screen.getByText(copy.empty)).toBeVisible()
    expect(screen.getByRole("link", { name: copy.browse })).toHaveAttribute("href", "/courses")
  })

  it("points to the courses page when the courses cannot be loaded", async () => {
    loadShowcase.mockRejectedValue(new Error("offline"))
    const { container } = renderShowcase()
    approach()

    expect(await screen.findByText(copy.error)).toBeVisible()
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0)
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
    const user = userEvent.setup()
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
    const user = userEvent.setup()
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockReturnValue(undefined)
    const { unmount } = renderShowcase()

    await user.click(playButton())
    const video = screen.getByLabelText(copy.tour.label)
    unmount()

    expect(pause.mock.contexts).toStrictEqual([video])
  })
})
