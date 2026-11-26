import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { COURSE_ACCESS_TEST_MESSAGES, COURSE_ACCESS_TEST_NAMES } from "~/src/modules/course/__test__/fixtures/course-access.messages"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS, LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"

import { CourseShowcase } from "~/src/presentation/components/custom/landing-page/components/course-showcase"

import facts from "~/messages/en-US/components.custom.course-facts.json"
import meta from "~/messages/en-US/components.custom.lesson-meta.json"
import copy from "~/messages/en-US/pages.landing.studio.masterclass.json"

type ShowcaseCourse = Course["showcase"][number]

const withOffer = (message: string): string => message.replace("{offer}", COURSE_ACCESS_TEST_NAMES.offer)

const loadShowcase = vi.hoisted(() => vi.fn<() => Promise<Course["showcase"]>>())

vi.mock(import("~/src/modules/lesson/lesson.access"), async (importOriginal) => {
  const { withTestCourseAccess } = await import("~/src/modules/course/__test__/fixtures/course-access")

  return withTestCourseAccess(importOriginal)
})

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

const COVER_KEY = "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-0000000c0ve1.webp"

const WALKTHROUGH: ShowcaseCourse = {
  cover: COVER_KEY,
  durationMs: 1_500_000,
  icon: COURSE_ICON.MAP,
  id: "walkthrough",
  kind: COURSE_KIND.COURSE,
  lessonCount: 8,
  lessons: [
    {
      access: LESSON_ACCESS.PREVIEW,
      durationMs: 125_000,
      format: LESSON_FORMAT.VIDEO,
      locked: false,
      recording: false,
      slug: "boundaries",
      title: "Lesson boundaries",
    },
    {
      access: LESSON_ACCESS.ACCOUNT,
      durationMs: 125_000,
      format: LESSON_FORMAT.VIDEO,
      locked: true,
      recording: false,
      slug: "sessions",
      title: "Sessions",
    },
    {
      access: LESSON_ACCESS.PAID,
      durationMs: null,
      format: LESSON_FORMAT.VIDEO,
      locked: true,
      recording: true,
      slug: "billing",
      title: "Billing",
    },
  ],
  level: COURSE_LEVEL.BEGINNER,
  previewCount: 1,
  recordedCount: 6,
  slug: "code-walkthrough",
  title: "The walkthrough",
}

const TUTORIAL: ShowcaseCourse = {
  cover: null,
  durationMs: 0,
  icon: COURSE_ICON.BOOK_OPEN,
  id: "tutorial",
  kind: COURSE_KIND.TUTORIAL,
  lessonCount: 0,
  lessons: [],
  level: COURSE_LEVEL.ADVANCED,
  previewCount: 0,
  recordedCount: 0,
  slug: "one-off",
  title: "One-off tutorial",
}

const UNRECORDED: ShowcaseCourse = {
  cover: null,
  durationMs: 0,
  icon: COURSE_ICON.ROCKET,
  id: "project",
  kind: COURSE_KIND.PROJECT,
  lessonCount: 2,
  lessons: [
    {
      access: LESSON_ACCESS.PREVIEW,
      durationMs: null,
      format: LESSON_FORMAT.VIDEO,
      locked: false,
      recording: true,
      slug: "intro",
      title: "Intro",
    },
    {
      access: LESSON_ACCESS.PAID,
      durationMs: 540_000,
      format: LESSON_FORMAT.VIDEO,
      locked: false,
      recording: false,
      slug: "deep-dive",
      title: "Deep dive",
    },
  ],
  level: COURSE_LEVEL.INTERMEDIATE,
  previewCount: 1,
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

const SKELETONS_PER_COURSE = 6 + COURSE_SHOWCASE.LESSONS * 3

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

const FIVE_COURSES: ShowcaseCourse[] = [
  WALKTHROUGH,
  TUTORIAL,
  UNRECORDED,
  RECORDED,
  { ...WALKTHROUGH, id: "sequel", slug: "sequel", title: "The sequel" },
]

const expectOnly = (content: Element | null): void => {
  const section = content?.parentElement

  expect(section?.children).toHaveLength(1)
  expect(section?.querySelector('[data-slot="skeleton"], .invisible')).toBeNull()
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

  it("links every course and its first lessons, opening the free ones and marking the locked ones", async () => {
    const { container } = renderShowcase()
    await showcaseLoaded()

    expect(loadShowcase).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: WALKTHROUGH.title })).toHaveAttribute("href", "/courses/code-walkthrough")
    expect(screen.getByRole("link", { name: TUTORIAL.title })).toHaveAttribute("href", "/courses/one-off")
    const preview = screen.getByRole("link", { name: `Lesson boundaries ${meta.access.preview} 2:05` })
    const account = screen.getByRole("link", { name: `Sessions ${meta.locked.account} 2:05` })
    expect(preview).toHaveAttribute("href", "/courses/code-walkthrough/boundaries")
    expect(account).toHaveAttribute("href", "/courses/code-walkthrough/sessions")
    expect(preview.querySelector(".lucide-play.fill-current")).not.toBeNull()
    expect(account.querySelector(".lucide-lock")).not.toBeNull()
    expect(within(account).getByText(meta.access.account)).toHaveAttribute("aria-hidden", "true")
    expect(within(account).queryByText(meta.access.preview)).toBeNull()
    expect(screen.queryByRole("link", { name: /Billing/u })).toBeNull()
    expect(screen.getByText("Billing").parentElement).toHaveTextContent(withOffer(meta.locked.paid))
    expect(screen.getByRole("link", { name: "+ 5 more lessons" })).toHaveAttribute("href", "/courses/code-walkthrough")
    expect(container.querySelector(`img[src="/media/${COVER_KEY}"]`)).toHaveAttribute("alt", "")
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
  })

  it("sets every lesson title above its tag and its state, locked or open", async () => {
    renderShowcase()
    await showcaseLoaded()

    const preview = screen.getByRole("link", { name: /^Lesson boundaries/u })
    const account = screen.getByRole("link", { name: /^Sessions/u })
    expect(within(preview).getByText("Lesson boundaries")).toHaveClass("font-medium", "text-foreground")
    expect(within(account).getByText("Sessions")).toHaveClass("font-medium", "text-foreground")
    expect(within(preview).getByText(meta.access.preview)).toHaveAttribute("aria-hidden", "false")
    expect(screen.getByText("Billing").parentElement).toHaveTextContent(meta.coming)
    expect(screen.getByText(meta.coming)).toHaveAttribute("data-slot", "lesson-coming")
  })

  it("plays nothing from a lesson being recorded and links a recorded lesson the viewer can open", async () => {
    loadShowcase.mockResolvedValue([UNRECORDED])
    renderShowcase()
    await showcaseLoaded()

    expect(screen.queryByRole("link", { name: /Intro/u })).toBeNull()
    expect(screen.getByText("Intro").parentElement).toHaveTextContent(meta.coming)
    expect(screen.getByRole("link", { name: `Deep dive ${withOffer(meta.access.paid)} 9:00` })).toHaveAttribute(
      "href",
      "/courses/unrecorded/deep-dive",
    )
  })

  it("links a text lesson with the icon of a page", async () => {
    loadShowcase.mockResolvedValue([
      {
        ...UNRECORDED,
        lessons: [
          {
            access: LESSON_ACCESS.PREVIEW,
            durationMs: null,
            format: LESSON_FORMAT.TEXT,
            locked: false,
            recording: false,
            slug: "glossary",
            title: "Glossary",
          },
        ],
      },
    ])
    renderShowcase()
    await showcaseLoaded()

    const glossary = screen.getByRole("link", { name: /^Glossary/u })
    expect(glossary).toHaveAttribute("href", "/courses/unrecorded/glossary")
    expect(glossary.querySelector(".lucide-file-text")).not.toBeNull()
  })

  it("says how much of each course is recorded and how many lessons it holds beyond the first ones", async () => {
    loadShowcase.mockResolvedValue([WALKTHROUGH, TUTORIAL, UNRECORDED, RECORDED])
    renderShowcase()
    await showcaseLoaded()

    expect(screen.getByText("Course · Beginner")).toBeVisible()
    expect(screen.getByText("Tutorial · Advanced")).toBeVisible()
    expect(screen.getByText("6 of 8 lessons ready")).toBeVisible()
    expect(screen.getByText("25 min")).toBeVisible()
    expect(screen.getByText("+ 5 more lessons")).toBeVisible()
    expect(screen.getAllByText("2 lessons")).toHaveLength(2)
    expect(screen.getByText("9 min")).toBeVisible()
    expect(screen.getAllByText(/more lessons?$/u)).toHaveLength(1)
    expect(screen.getAllByText(facts.recordingNow)).toHaveLength(2)
    expect(screen.getAllByText("1 free lesson")).toHaveLength(3)
    expect(screen.getAllByText(meta.coming).length).toBeGreaterThan(1)
  })

  it("shows the placeholder tiles while the courses load", () => {
    loadShowcase.mockReturnValue(Promise.withResolvers<Course["showcase"]>().promise)
    const { container } = renderShowcase()
    approach()

    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true")
    expect(container.querySelectorAll('[aria-hidden="true"] [data-slot="skeleton"]')).toHaveLength(
      COURSE_SHOWCASE.COURSES * SKELETONS_PER_COURSE,
    )
    expect(container.querySelector(".invisible [data-slot='skeleton']")).toBeNull()
  })

  it("says in one line, with nothing reserved around it, when no course is published", async () => {
    loadShowcase.mockResolvedValue([])
    renderShowcase()
    await showcaseLoaded()

    expectOnly(screen.getByText(copy.empty))
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: copy.browse })).toHaveAttribute("href", "/courses")
  })

  it.each([1, 2, 5])("fits %i courses with no placeholder left below them", async (count) => {
    loadShowcase.mockResolvedValue(FIVE_COURSES.slice(0, count))
    renderShowcase()
    await showcaseLoaded()

    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(count)
    expectOnly(screen.getByRole("link", { name: WALKTHROUGH.title }).closest("ul"))
  })

  it("points to the courses page in one line when the courses cannot be loaded", async () => {
    loadShowcase.mockRejectedValue(new Error("offline"))
    renderShowcase()
    approach()

    expect(await screen.findByText(copy.error)).toBeVisible()
    expectOnly(screen.getByText(copy.error))
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
