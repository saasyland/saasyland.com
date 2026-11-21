import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getHeaderHref } from "~/src/platform/testing/lib/navigation"

import { getNavigationLabel } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import type { Course } from "~/src/modules/course/course.types"
import { courseLessons } from "~/src/modules/course/course.utils"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { LESSON_PROGRESS_MUTATION_KEYS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import {
  CATALOGUE_COURSES,
  CUSTOMER_PAGE,
  GUEST_PAGE,
  LEARNER_PAGE,
  type PlayerProps,
  TUTORIAL_ROW,
  WALKTHROUGH_ROW,
  lesson,
  page,
  resetCoursePages,
  signedInUnlock,
  signedOutUnlock,
  withOffer,
  withRedirect,
} from "~/src/routes/__test__/fixtures/course-pages"
import { clearCourseRouters, expand, renderCourses, stubCourseGlobals } from "~/src/routes/__test__/fixtures/course-router"

import { HEADER_NAVIGATION } from "~/src/data/navigation"

import { CataloguePending, CoursePending, LessonPending } from "~/src/presentation/components/custom/courses/courses-pending"

import covers from "~/messages/en-US/components.custom.course-covers.json"
import meta from "~/messages/en-US/components.custom.lesson-meta.json"
import messages from "~/messages/en-US/pages.courses.json"
import plNavigationMessages from "~/messages/pl-PL/components.custom.navigation.json"
import plCoursesNavigationMessages from "~/messages/pl-PL/navigation.courses.json"
import { ROUTES } from "~/src/routes"

vi.mock(import("~/src/modules/verification/use-cases/send-verification-email"), async () => {
  const fixtures = await import("~/src/routes/__test__/fixtures/course-pages")
  return { sendVerificationEmailMutation: { mutationFn: fixtures.resendVerification, mutationKey: VERIFICATION_MUTATION_KEYS.SEND_EMAIL } }
})

vi.mock(import("~/src/presentation/components/custom/video-player"), async () => {
  const fixtures = await import("~/src/routes/__test__/fixtures/course-pages")
  return {
    VideoPlayer: (props: PlayerProps) => {
      fixtures.player.set("props", props)
      return <div data-start={props.startAt} data-testid="video-player" />
    },
  }
})

vi.mock(import("~/src/modules/course/use-cases/get-course"), async (importOriginal) => {
  const actual = await importOriginal()
  const fixtures = await import("~/src/routes/__test__/fixtures/course-pages")
  return {
    ...actual,
    courseQuery: (input: Course["getCourse"]) => ({
      ...actual.courseQuery(input),
      queryFn: () => {
        const current = fixtures.coursePages.get("current")
        return current === undefined ? Promise.reject(new Error("No course page")) : Promise.resolve(current)
      },
    }),
  }
})

vi.mock(import("~/src/modules/lesson/use-cases/get-lesson"), async (importOriginal) => {
  const actual = await importOriginal()
  const fixtures = await import("~/src/routes/__test__/fixtures/course-pages")
  return {
    ...actual,
    lessonQuery: (input: Lesson["getLesson"]) => ({
      ...actual.lessonQuery(input),
      queryFn: () => {
        const source = fixtures.coursePages.get("current")
        const lessonPage = source === undefined ? undefined : fixtures.lessonPageOf(source, input.lessonSlug)
        return lessonPage === undefined ? Promise.reject(new Error("No lesson page")) : Promise.resolve(lessonPage)
      },
    }),
  }
})

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

vi.mock(import("~/src/modules/lesson-progress/use-cases/save-lesson-progress"), async () => {
  const fixtures = await import("~/src/routes/__test__/fixtures/course-pages")
  return { saveLessonProgressMutation: { mutationFn: fixtures.save, mutationKey: LESSON_PROGRESS_MUTATION_KEYS.SAVE } }
})

beforeEach(() => {
  vi.clearAllMocks()
  stubCourseGlobals()
  resetCoursePages()
})

afterEach(() => {
  cleanup()
  clearCourseRouters()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("course catalogue", () => {
  it("features the first course and lists the others with their state, size and free lessons", async () => {
    await renderCourses({ path: "/courses" })

    const featured = screen.getByRole("link", { name: /The walkthrough/u })
    expect(featured).toHaveAttribute("href", "/courses/the-walkthrough")
    expect(within(featured).getByText(messages.kinds.course)).toBeVisible()
    expect(within(featured).getByText(messages.levels.beginner)).toBeVisible()
    expect(within(featured).getByText("3 of 4 lessons recorded")).toBeVisible()
    expect(within(featured).queryByText("4 lessons")).toBeNull()
    expect(within(featured).getByText("7 min")).toBeVisible()
    expect(within(featured).getByText("1 free lesson")).toBeVisible()
    expect(within(featured).queryByRole("progressbar")).toBeNull()
    expect(featured.querySelector("[data-slot=course-cover]")).toHaveAttribute("aria-hidden", "true")
    expect(featured.querySelector("img")).toBeNull()
  })

  it("shows a course being recorded with its cover and offers what unlocks the paid lessons", async () => {
    await renderCourses({ path: "/courses" })

    const tutorial = screen.getByRole("link", { name: /One-off tutorial/u })
    expect(tutorial).toHaveTextContent(`${messages.kinds.tutorial}${messages.levels.advanced}`)
    expect(tutorial).toHaveTextContent(`${messages.catalogue.recordingNow}0 lessons`)
    expect(tutorial).not.toHaveTextContent("min")
    expect(tutorial.querySelector("img")).toHaveAttribute("alt", "")
    expect(tutorial.querySelector("img")).toHaveAttribute("loading", "lazy")
    const band = within(
      screen.getByRole("heading", { level: 2, name: withOffer(messages.course.unlock.title) }).closest("aside") ?? document.body,
    )
    expect(band.getByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toHaveAttribute(
      "href",
      signedOutUnlock(ROUTES.COURSES),
    )
    expect(band.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", withRedirect(ROUTES.SIGN_IN, ROUTES.COURSES))
  })

  it("offers a signed-in customer what unlocks the paid lessons, and a holder who has not confirmed their email nothing to buy", async () => {
    const customer = await renderCourses({
      catalogue: { courses: CATALOGUE_COURSES, viewer: { mustConfirmEmail: false, signedIn: true, unlocked: false } },
      path: "/courses",
    })

    const band = within(
      screen.getByRole("heading", { level: 2, name: withOffer(messages.course.unlock.title) }).closest("aside") ?? document.body,
    )
    expect(band.getByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toHaveAttribute(
      "href",
      signedInUnlock(ROUTES.COURSES),
    )
    expect(band.queryByRole("link", { name: "Sign in" })).toBeNull()

    customer.options.context.queryClient.setQueryData(catalogueQuery({ locale: "en-US" }).queryKey, {
      courses: CATALOGUE_COURSES,
      viewer: { mustConfirmEmail: true, signedIn: true, unlocked: false },
    })

    await waitFor(() => {
      expect(screen.queryByRole("heading", { level: 2, name: withOffer(messages.course.unlock.title) })).toBeNull()
    })
  })

  it("shows a learner's progress and offers nothing to buy to someone who can open every lesson", async () => {
    const courses = [TUTORIAL_ROW, { ...WALKTHROUGH_ROW, completed: 2 }]
    await renderCourses({ catalogue: { courses, viewer: { mustConfirmEmail: false, signedIn: true, unlocked: true } }, path: "/courses" })

    expect(screen.getByRole("progressbar", { name: "2 of 4 completed" })).toHaveAttribute("aria-valuenow", "2")
    expect(screen.getByRole("link", { name: /One-off tutorial/u }).querySelector("img")).toHaveAttribute("fetchpriority", "high")
    expect(screen.queryByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeNull()
  })

  it("says the first courses are being recorded and points to the build log when nothing is published", async () => {
    await renderCourses({
      catalogue: { courses: [], viewer: { mustConfirmEmail: false, signedIn: false, unlocked: false } },
      path: "/courses",
    })

    expect(screen.getByRole("heading", { level: 2, name: messages.catalogue.empty.title })).toBeVisible()
    expect(screen.getByText(messages.catalogue.empty.body)).toBeVisible()
    expect(screen.queryByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeNull()
  })

  it("keeps the courses link current in the localized navigation", async () => {
    await renderCourses({ locale: "pl-PL", path: "/pl-PL/courses" })

    const nav = within(screen.getByRole("navigation", { name: plNavigationMessages.ariaLabel }))
    const pageLabel = getNavigationLabel("pl-PL")
    expect(nav.getByRole("link", { current: "page" })).toHaveAccessibleName(plCoursesNavigationMessages.header.courses)
    const headerHref = getHeaderHref("pl-PL")
    for (const entry of HEADER_NAVIGATION) {
      expect(nav.getByRole("link", { name: pageLabel(entry) })).toHaveAttribute("href", headerHref(entry))
    }
    expect(nav.getByRole("link", { name: plNavigationMessages.getStarted })).toHaveAttribute("href", "/pl-PL#pricing")
  })
})

describe("course page", () => {
  it("starts a visitor on the free lesson, offers what unlocks the locked ones and opens the first chapter", async () => {
    await renderCourses({ path: "/courses/the-walkthrough" })

    expect(screen.getByRole("heading", { level: 1, name: "The walkthrough" })).toBeVisible()
    const panel = within(screen.getByRole("region", { name: "The walkthrough" }))
    expect(panel.getByText("3 of 4 lessons recorded")).toBeVisible()
    expect(panel.getByRole("link", { name: messages.course.start })).toHaveAttribute("href", "/courses/the-walkthrough/boundaries")
    expect(panel.getByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toHaveAttribute(
      "href",
      signedOutUnlock("/courses/the-walkthrough"),
    )
    expect(screen.queryByText(/lessons completed/u)).toBeNull()

    const boundaries = screen.getByRole("link", { name: /Boundaries/u })
    expect(boundaries).toHaveTextContent("01")
    expect(boundaries).toHaveTextContent("2:05")
    expect(boundaries).toHaveTextContent(meta.access.preview)
    expect(screen.getByRole("link", { name: /Sessions/u })).toHaveTextContent(meta.access.account)
    expect(screen.queryByRole("link", { name: /Coverage/u })).toBeNull()

    await expand(/^Product/u)

    const coverage = screen.getByRole("link", { name: /Coverage/u })
    expect(coverage).toHaveTextContent("04")
    expect(coverage).not.toHaveTextContent(/\d:\d\d/u)
    expect(coverage).toHaveTextContent(meta.coming)
    expect(coverage).toHaveAccessibleName(new RegExp(withOffer(meta.locked.paid), "u"))
    expect(screen.queryByText(messages.course.recording)).toBeNull()
  })

  it("keeps a locked lesson's title as bright as an open one and announces the lock in place of its tag", async () => {
    await renderCourses({ path: "/courses/the-walkthrough" })
    await expand(/^Product/u)

    const coverage = screen.getByRole("link", { name: /Coverage/u })
    expect(within(coverage).getByText("Coverage")).toHaveClass("font-medium", "text-foreground")
    expect(within(coverage).getByText(withOffer(meta.access.paid))).toHaveAttribute("aria-hidden", "true")
    expect(within(screen.getByRole("link", { name: /Boundaries/u })).getByText("Boundaries")).toHaveClass("font-medium", "text-foreground")
  })

  it("lets a guest who already holds the offer sign in from the panel and come back to the course", async () => {
    await renderCourses({ path: "/courses/the-walkthrough" })

    const panel = within(screen.getByRole("region", { name: "The walkthrough" }))
    expect(panel.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", withRedirect(ROUTES.SIGN_IN, "/courses/the-walkthrough"))
  })

  it("shows a learner's progress, per chapter too, and continues where they stopped", async () => {
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough" })

    expect(screen.getByRole("progressbar", { name: "1 of 4 lessons completed" })).toHaveAttribute("aria-valuenow", "1")
    expect(screen.getByRole("button", { name: /^Foundations/u })).toHaveTextContent("1/2")
    expect(screen.getByRole("link", { name: "Continue with Sessions" })).toHaveAttribute("href", "/courses/the-walkthrough/sessions")
    expect(screen.getByRole("link", { name: /Boundaries/u })).toHaveTextContent(messages.lesson.completed)
    expect(screen.getByText(messages.course.panel.access)).toBeVisible()
    expect(screen.queryByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeNull()
  })

  it("sends a signed-in customer where an area grants course access", async () => {
    await renderCourses({ data: CUSTOMER_PAGE, path: "/courses/the-walkthrough" })

    const panel = within(screen.getByRole("region", { name: "The walkthrough" }))
    expect(panel.getByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toHaveAttribute(
      "href",
      signedInUnlock("/courses/the-walkthrough"),
    )
    expect(panel.queryByRole("link", { name: "Sign in" })).toBeNull()
  })

  it("asks a holder who has not confirmed their email to confirm it instead of offering what they hold", async () => {
    await renderCourses({
      data: { ...CUSTOMER_PAGE, viewer: { mustConfirmEmail: true, signedIn: true } },
      path: "/courses/the-walkthrough",
    })

    const panel = within(screen.getByRole("region", { name: "The walkthrough" }))
    expect(panel.getByRole("link", { name: messages.lesson.locked.confirm.title })).toHaveAttribute(
      "href",
      withRedirect(ROUTES.VERIFY_EMAIL, "/courses/the-walkthrough"),
    )
    expect(panel.queryByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeNull()
    expect(panel.queryByText(messages.course.panel.access)).toBeNull()
  })

  it("says a course is being recorded and offers no start link while no lesson plays", async () => {
    const recording = page({
      lessons: [
        lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW, durationMs: null }),
        lesson("billing", "Billing", { durationMs: null, locked: true }),
      ],
      viewer: { mustConfirmEmail: false, signedIn: false },
    })
    await renderCourses({ data: recording, path: "/courses/the-walkthrough" })

    expect(screen.getByText(messages.course.recording)).toBeVisible()
    expect(screen.queryByRole("link", { name: messages.course.start })).toBeNull()
    expect(screen.getAllByText(meta.coming)).toHaveLength(2)
    expect(screen.getByRole("link", { name: /Boundaries/u }).querySelector("[data-slot=lesson-recording]")).not.toBeNull()
    expect(screen.getByRole("button", { name: /^Foundations/u })).toHaveTextContent(messages.catalogue.recordingNow)
  })

  it("starts a learner on the first lesson that plays", async () => {
    const partly = page({
      lessons: [
        lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW, durationMs: null }),
        lesson("sessions", "Sessions", { access: LESSON_ACCESS.ACCOUNT }),
      ],
      viewer: { mustConfirmEmail: false, signedIn: true },
    })
    await renderCourses({ data: partly, path: "/courses/the-walkthrough" })

    expect(screen.getByRole("link", { name: messages.course.start })).toHaveAttribute("href", "/courses/the-walkthrough/sessions")
    expect(screen.queryByText(messages.course.recording)).toBeNull()
    expect(screen.getByRole("button", { name: /^Foundations/u })).toHaveTextContent("1 of 2 lessons recorded")
  })

  it("offers only what unlocks a course whose lessons are all locked", async () => {
    const locked = page({ lessons: [lesson("billing", "Billing", { locked: true })], viewer: { mustConfirmEmail: false, signedIn: false } })
    await renderCourses({ data: locked, path: "/courses/the-walkthrough" })

    expect(screen.queryByRole("link", { name: messages.course.start })).toBeNull()
    expect(screen.getByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeVisible()
  })
})

describe("course page panel and lists", () => {
  it("offers no action on a course with no lesson to watch or buy", async () => {
    const empty = { ...GUEST_PAGE, chapters: [] }
    await renderCourses({ data: empty, path: "/courses/the-walkthrough" })

    const panel = within(screen.getByRole("region", { name: "The walkthrough" }))
    expect(panel.queryByRole("link")).toBeNull()
    expect(panel.getByText("0 lessons")).toBeVisible()
  })

  it("introduces the course with its cover, level, size, outcomes, prerequisites and what it includes", async () => {
    const lessons = [
      lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW, captioned: true }),
      ...courseLessons(GUEST_PAGE).slice(1),
    ]
    const data = {
      ...GUEST_PAGE,
      chapters: [
        { id: "chapter-one", lessons, summary: "Foundations in short.", title: "Foundations" },
        { id: "chapter-two", lessons: [], summary: "", title: "Later" },
      ],
      course: {
        ...GUEST_PAGE.course,
        materials: 3,
        outcomes: ["Ship it"],
        prerequisites: ["Know React", "Laptop"],
        slug: "code-walkthrough",
      },
    }
    await renderCourses({ data, path: "/courses/the-walkthrough" })

    expect(screen.getByText("Foundations in short.")).toBeVisible()
    expect(screen.getByRole("img", { name: covers.codeWalkthrough })).toHaveAttribute("fetchpriority", "high")
    expect(screen.getAllByText("3 of 4 lessons recorded")).toHaveLength(3)
    const outcomes = screen.getByRole("heading", { level: 2, name: messages.course.outcomes }).nextElementSibling
    expect(outcomes).toHaveTextContent("Ship it")
    const prerequisites = screen.getByRole("heading", { level: 2, name: messages.course.prerequisites }).nextElementSibling
    expect(prerequisites?.querySelectorAll("li")).toHaveLength(2)
    const includes = screen.getByRole("list", { name: messages.course.includes.title })
    const expected = ["4 lessons", "7 min of video", "1 free lesson", "3 downloads and links", messages.course.includes.captions]
    expect(includes).toHaveTextContent([...expected, messages.course.includes.progress, `Level: ${messages.levels.beginner}`].join(""))
  })

  it("leaves out what a course does not have and the chapter heading of a course with one chapter", async () => {
    const lessons = ["Boundaries", "Sessions", "Billing", "Coverage"].map((title) =>
      lesson(title.toLowerCase(), title, { durationMs: null }),
    )
    const single = { ...GUEST_PAGE, chapters: [{ id: "only", lessons, summary: "Everything.", title: "Agents" }] }
    await renderCourses({ data: single, path: "/courses/the-walkthrough" })

    expect(screen.queryByRole("heading", { name: messages.course.outcomes })).toBeNull()
    expect(screen.queryByRole("heading", { name: messages.course.prerequisites })).toBeNull()
    expect(screen.getByRole("region", { name: messages.course.curriculum }).querySelector("h3")).toBeNull()
    expect(screen.queryByText("Everything.")).toBeNull()
    expect(screen.getByRole("link", { name: /Coverage/u })).toHaveTextContent("04")
    const includes = within(screen.getByRole("list", { name: messages.course.includes.title }))
    expect(includes.getAllByRole("listitem")).toHaveLength(4)
  })
})

describe("course skeletons", () => {
  it.each([
    ["catalogue", CataloguePending],
    ["course", CoursePending],
    ["lesson", LessonPending],
  ])("marks the %s skeleton as busy", (_, Pending) => {
    const { container } = render(<Pending />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
