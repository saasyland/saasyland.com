import { cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ATTACHMENT_FILE_TYPES, LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { LESSON_PROGRESS_MUTATION_KEYS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"
import type { Lesson } from "~/src/modules/lesson/lesson.types"
import { lessonQuery } from "~/src/modules/lesson/use-cases/get-lesson"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"
import { VERIFICATION_MUTATION_KEYS } from "~/src/modules/verification/verification.constants"

import {
  CATALOGUE,
  COURSE_SLUG,
  CUSTOMER_PAGE,
  GUEST_PAGE,
  LEARNER_PAGE,
  PLAYBACK,
  type PlayerProps,
  SIGNED_IN_UNLOCK,
  SIGNED_OUT_UNLOCK,
  completeLesson,
  coursePages,
  details,
  lesson,
  materials,
  page,
  player,
  resendVerification,
  resetCoursePages,
  save,
  withOffer,
  withRedirect,
} from "~/src/routes/__test__/fixtures/course-pages"
import {
  clearCourseRouters,
  createCourseRouter,
  mountCourseRouter,
  renderCourses,
  stubCourseGlobals,
} from "~/src/routes/__test__/fixtures/course-router"

import meta from "~/messages/en-US/components.custom.lesson-meta.json"
import messages from "~/messages/en-US/pages.courses.json"
import { ROUTES } from "~/src/routes"

const unconfirmed = () => {
  const session = createAuthSessionFixture()
  return { ...session, user: { ...session.user, emailVerified: false } }
}

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
        if (source === undefined) {
          return Promise.reject(new Error("No course page"))
        }
        const lessonPage = fixtures.lessonPageOf(source, input.lessonSlug)
        return lessonPage === undefined ? Promise.reject(new Error("No lesson page")) : Promise.resolve(lessonPage)
      },
    }),
  }
})

vi.mock(import("~/src/modules/lesson/lesson.access"), async (importOriginal) => {
  const { withTestCourseAccess } = await import("~/src/modules/course/__test__/fixtures/course-access")

  return withTestCourseAccess(importOriginal)
})

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

describe("lesson page", () => {
  it("plays a free lesson for a visitor without saving progress", async () => {
    await renderCourses({ path: "/courses/the-walkthrough/boundaries" })

    expect(await screen.findByTestId("video-player")).toHaveAttribute("data-start", "0")
    expect(player.get("props")?.playback).toStrictEqual(PLAYBACK)
    expect(screen.getByRole("heading", { level: 1, name: "Boundaries" })).toBeVisible()
    expect(screen.getByRole("heading", { level: 1 }).nextElementSibling).toHaveTextContent(`${meta.access.preview} 2:05`)
    expect(screen.queryByRole("button", { name: messages.lesson.markComplete })).toBeNull()
    player.get("props")?.onProgress?.(30)
    player.get("props")?.onPause?.(31)
    player.get("props")?.onEnded?.()
    expect(save).not.toHaveBeenCalled()

    const neighbours = within(screen.getByRole("navigation", { name: messages.lesson.neighbours }))
    expect(neighbours.getByRole("link", { name: /Sessions/u })).toHaveAttribute("href", "/courses/the-walkthrough/sessions")
    expect(neighbours.queryByText(messages.lesson.previous)).toBeNull()
  })

  it("resumes a learner, saves the position at most every fifteen seconds and completes on the end", async () => {
    const router = await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/sessions" })
    const invalidate = vi.spyOn(router.options.context.queryClient, "invalidateQueries")

    expect(await screen.findByTestId("video-player")).toHaveAttribute("data-start", "42.5")
    player.get("props")?.onProgress?.(50.4)
    player.get("props")?.onProgress?.(55)
    await waitFor(() => {
      expect(save).toHaveBeenCalledOnce()
    })
    expect(save.mock.calls[0]?.[0]).toStrictEqual({ completed: false, lessonId: "lesson-sessions", positionMs: 50_400 })
    expect(invalidate).not.toHaveBeenCalled()

    coursePages.set("current", completeLesson(LEARNER_PAGE, "sessions"))
    player.get("props")?.onEnded?.()
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.DETAIL })
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LESSON_QUERY_KEYS.DETAIL })
    expect(save.mock.calls[1]?.[0]).toStrictEqual({ completed: true, lessonId: "lesson-sessions", positionMs: 0 })
    expect(await screen.findByText(messages.lesson.completed, { selector: "p" })).toBeVisible()
  })

  it("saves the position at once when a learner pauses, between the saves made while the lesson plays", async () => {
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/sessions" })

    expect(await screen.findByTestId("video-player")).toHaveAttribute("data-start", "42.5")
    player.get("props")?.onProgress?.(43)
    player.get("props")?.onPause?.(44.2)
    player.get("props")?.onProgress?.(45)
    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(2)
    })
    expect(save.mock.calls.map(([input]) => input)).toStrictEqual([
      { completed: false, lessonId: "lesson-sessions", positionMs: 43_000 },
      { completed: false, lessonId: "lesson-sessions", positionMs: 44_200 },
    ])
  })

  it("marks a lesson complete from the button", async () => {
    const user = userEvent.setup({ delay: null })
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/sessions" })

    await user.click(screen.getByRole("button", { name: messages.lesson.markComplete }))

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith({ completed: true, lessonId: "lesson-sessions", positionMs: 0 }, expect.anything())
    })
  })

  it("offers nothing to complete on a lesson that is being recorded", async () => {
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/coverage" })

    expect(screen.getByText(messages.lesson.noVideo)).toBeVisible()
    expect(screen.getByRole("heading", { level: 1 }).nextElementSibling).toHaveTextContent(meta.coming)
    expect(screen.queryByRole("button", { name: messages.lesson.markComplete })).toBeNull()
    const neighbours = within(screen.getByRole("navigation", { name: messages.lesson.neighbours }))
    expect(neighbours.getByRole("link", { name: /Billing/u })).toHaveTextContent(messages.lesson.previous)
  })

  it("says a lesson is already completed", async () => {
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/boundaries" })

    expect(screen.getByText(messages.lesson.completed, { selector: "p" })).toBeVisible()
    expect(screen.queryByRole("button", { name: messages.lesson.markComplete })).toBeNull()
  })

  it.each([
    {
      cta: messages.lesson.locked.account.cta,
      data: GUEST_PAGE,
      href: withRedirect(ROUTES.AUTH.SIGN_UP, "/courses/the-walkthrough/sessions"),
      path: "sessions",
    },
    {
      cta: withOffer(messages.lesson.locked.paid.cta),
      data: GUEST_PAGE,
      href: SIGNED_OUT_UNLOCK,
      path: "billing",
    },
    {
      cta: withOffer(messages.lesson.locked.paid.cta),
      data: CUSTOMER_PAGE,
      href: SIGNED_IN_UNLOCK,
      path: "billing",
    },
  ])("locks $path and links to $href", async ({ cta, data, href, path }) => {
    await renderCourses({ data, path: `/courses/the-walkthrough/${path}` })

    expect(screen.queryByTestId("video-player")).toBeNull()
    expect(screen.queryByRole("button", { name: messages.lesson.markComplete })).toBeNull()
    expect(screen.getByRole("link", { name: cta })).toHaveAttribute("href", href)
  })
})

describe("lesson locks", () => {
  it("invites a guest to create a free account, and lets someone with an account sign in instead", async () => {
    await renderCourses({ data: GUEST_PAGE, path: "/courses/the-walkthrough/sessions" })

    const lock = within(screen.getByRole("heading", { name: messages.lesson.locked.account.title }).parentElement ?? document.body)
    expect(lock.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      withRedirect(ROUTES.AUTH.SIGN_IN, "/courses/the-walkthrough/sessions"),
    )
  })

  it("prices the offer on a paid lock, and lets a guest who has it sign in instead", async () => {
    await renderCourses({ data: GUEST_PAGE, path: "/courses/the-walkthrough/billing" })

    const price = screen.getByText(withOffer(messages.lesson.locked.paid.price).replace("{price}", "$100"))
    expect(price).toBeVisible()
    expect(within(price.parentElement ?? document.body).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      withRedirect(ROUTES.AUTH.SIGN_IN, "/courses/the-walkthrough/billing"),
    )
  })

  it("asks a holder who has not confirmed their email to confirm it, and resends the link to their address", async () => {
    const holder = { ...CUSTOMER_PAGE, viewer: { mustConfirmEmail: true, signedIn: true } }
    const router = createCourseRouter({ catalogue: CATALOGUE, data: holder, locale: "en-US", path: "/courses/the-walkthrough/billing" })
    const { queryClient } = router.options.context
    const signedIn = createAuthSessionFixture()
    const { user } = signedIn
    queryClient.setQueryData(getCurrentSessionQuery.queryKey, unconfirmed())
    await mountCourseRouter(router)

    expect(screen.getByRole("heading", { name: messages.lesson.locked.confirm.title })).toBeVisible()
    expect(screen.getByText(user.email, { selector: "strong" })).toBeVisible()
    expect(screen.queryByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeNull()
    expect(screen.getByRole("link", { name: messages.lesson.locked.confirm.change })).toHaveAttribute(
      "href",
      withRedirect(ROUTES.AUTH.VERIFY_EMAIL, "/courses/the-walkthrough/billing"),
    )
    await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name: messages.lesson.locked.confirm.resend }))
    await waitFor(() => {
      expect(resendVerification).toHaveBeenCalledWith({ callbackURL: ROUTES.AUTH.CALLBACK, email: user.email }, expect.anything())
    })

    queryClient.setQueryData(getCurrentSessionQuery.queryKey, signedIn)
    await waitFor(() => {
      expect(
        queryClient.getQueryState(lessonQuery({ courseSlug: COURSE_SLUG, lessonSlug: "billing", locale: "en-US" }).queryKey)?.isInvalidated,
      ).toBe(true)
    })
  })

  it("holds the player's place while the signed stream loads", async () => {
    const router = createCourseRouter({
      catalogue: CATALOGUE,
      data: GUEST_PAGE,
      locale: "en-US",
      path: "/courses/the-walkthrough/boundaries",
    })
    const { queryClient } = router.options.context
    queryClient.removeQueries({ queryKey: LESSON_QUERY_KEYS.PLAYBACK })
    void queryClient.query({
      queryFn: () => new Promise<never>(() => {}),
      queryKey: lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: "boundaries" }).queryKey,
    })
    const { container } = await mountCourseRouter(router)

    expect(screen.queryByTestId("video-player")).toBeNull()
    expect(container.querySelector(".aspect-video[data-slot='skeleton']")).not.toBeNull()
  })
})

describe("lesson page details and contents", () => {
  it("describes the lesson and lists its key moments, which a locked lesson cannot seek", async () => {
    details.set("boundaries", {
      captionLocales: ["en-US"],
      description: "Start here.\n\nThen `src/modules`.",
      keyMoments: [{ label: "The folder", seconds: 75 }],
    })
    details.set("billing", { captionLocales: ["en-US"], description: "", keyMoments: [{ label: "Webhooks", seconds: 3725 }] })
    await renderCourses({ path: "/courses/the-walkthrough/boundaries" })

    expect(screen.getByText("Start here.")).toBeVisible()
    expect(screen.getByText("src/modules", { selector: "code" })).toBeVisible()
    const moments = within(screen.getByRole("region", { name: messages.lesson.keyMoments }))
    expect(moments.getByRole("button", { name: "1:15 The folder" })).toBeVisible()
    expect(screen.getByRole("link", { name: `${messages.lesson.upNext} Sessions` })).toHaveAttribute(
      "href",
      "/courses/the-walkthrough/sessions",
    )
    const toc = within(screen.getByRole("navigation", { name: messages.lesson.onThisPage }))
    expect(toc.getByRole("link", { name: messages.lesson.about })).toHaveAttribute("href", "#lesson-description")
    expect(toc.getByRole("link", { name: messages.lesson.keyMoments })).toHaveAttribute("href", "#lesson-key-moments")
    expect(screen.queryByRole("region", { name: messages.lesson.transcript })).toBeNull()

    cleanup()
    await renderCourses({ path: "/courses/the-walkthrough/billing" })

    const locked = within(screen.getByRole("region", { name: messages.lesson.keyMoments }))
    expect(locked.getByText("1:02:05")).toBeVisible()
    expect(locked.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("region", { name: messages.lesson.transcript })).toBeNull()
  })

  it("opens the course contents in a sheet on small screens and closes it on the next lesson", async () => {
    const user = userEvent.setup({ delay: null })
    await renderCourses({ path: "/courses/the-walkthrough/boundaries" })

    const sidebar = within(screen.getByRole("navigation", { name: messages.lesson.contents }))
    expect(sidebar.getByRole("link", { name: /Boundaries/u })).toHaveAttribute("aria-current", "page")
    expect(sidebar.getByRole("link", { name: "The walkthrough" })).toHaveAttribute("href", "/courses/the-walkthrough")
    expect(sidebar.queryByText(/lessons completed/u)).toBeNull()

    await user.click(screen.getByRole("button", { name: messages.lesson.contents }))
    const sheet = within(await screen.findByRole("dialog", { name: messages.lesson.contents }))
    await user.click(sheet.getByRole("link", { name: /Sessions/u }))

    expect(await screen.findByRole("heading", { level: 1, name: "Sessions" })).toBeVisible()
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  it("hides and shows the course contents beside the lesson", async () => {
    const user = userEvent.setup({ delay: null })
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/sessions" })

    const toggle = screen.getByRole("button", { name: messages.lesson.hideContents })
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("1 of 4 lessons completed")).toBeVisible()
    expect(screen.getByRole("button", { name: /^Foundations/u })).toHaveAttribute("aria-expanded", "true")

    await user.click(toggle)

    expect(screen.getByRole("button", { name: messages.lesson.showContents })).toHaveAttribute("aria-expanded", "false")
    expect(document.querySelector("#lesson-sidebar")).toHaveClass("lg:hidden")
  })
})

describe("lesson page while recording, and its materials", () => {
  it("shows a text lesson without a stage or a player, and lets a learner complete it", async () => {
    const user = userEvent.setup({ delay: null })
    const text = page({
      lessons: [
        lesson("glossary", "Glossary", { access: LESSON_ACCESS.PREVIEW, durationMs: null, format: LESSON_FORMAT.TEXT, recording: false }),
      ],
      viewer: { mustConfirmEmail: false, signedIn: true },
    })
    await renderCourses({ data: text, path: "/courses/the-walkthrough/glossary" })

    expect(screen.queryByText(messages.lesson.noVideo)).toBeNull()
    expect(screen.queryByTestId("video-player")).toBeNull()
    expect(screen.getByRole("heading", { level: 1 }).nextElementSibling).toHaveTextContent(meta.text)
    await user.click(screen.getByRole("button", { name: messages.lesson.markComplete }))

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith({ completed: true, lessonId: "lesson-glossary", positionMs: 0 }, expect.anything())
    })
  })

  it("locks a paid text lesson behind its offer", async () => {
    await renderCourses({
      data: page({
        lessons: [lesson("glossary", "Glossary", { durationMs: null, format: LESSON_FORMAT.TEXT, recording: false, locked: true })],
        viewer: { mustConfirmEmail: false, signedIn: false },
      }),
      path: "/courses/the-walkthrough/glossary",
    })

    expect(screen.queryByText(messages.lesson.noVideo)).toBeNull()
    expect(screen.getByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeVisible()
  })

  it("shows a lesson without a video as being recorded and never plays it", async () => {
    const recording = page({
      lessons: [lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW, durationMs: null })],
      viewer: { mustConfirmEmail: false, signedIn: false },
    })
    await renderCourses({ data: recording, path: "/courses/the-walkthrough/boundaries" })

    expect(screen.getByText(messages.lesson.noVideo)).toBeVisible()
    expect(screen.queryByTestId("video-player")).toBeNull()
  })

  it("says a locked lesson is being recorded instead of selling it", async () => {
    await renderCourses({ path: "/courses/the-walkthrough/coverage" })

    expect(screen.getByText(messages.lesson.noVideo)).toBeVisible()
    expect(screen.queryByRole("link", { name: withOffer(messages.lesson.locked.paid.cta) })).toBeNull()
  })

  it("lists the materials, with downloads and links only for a lesson the viewer may open", async () => {
    materials.set("boundaries", [
      {
        contentType: LESSON_ATTACHMENT_FILE_TYPES.pdf,
        fileName: "slides.pdf",
        href: "/media/downloads/a.b/attachment/slides.pdf",
        id: "file",
        kind: LESSON_ATTACHMENT_KIND.FILE,
        sizeBytes: 2_500_000,
        title: "Slides",
      },
      { href: "/docs/features/courses", id: "link", kind: LESSON_ATTACHMENT_KIND.LINK, title: "Course docs" },
    ])
    materials.set("billing", [{ href: undefined, id: "locked", kind: LESSON_ATTACHMENT_KIND.LINK, title: "Pricing sheet" }])
    await renderCourses({ path: "/courses/the-walkthrough/boundaries" })

    const list = within(screen.getByRole("region", { name: messages.lesson.materials.title }))
    expect(list.getByRole("link", { name: "Slides" })).toHaveAttribute("href", "/media/downloads/a.b/attachment/slides.pdf")
    expect(list.getByRole("link", { name: "Slides" })).toHaveAttribute("download", "slides.pdf")
    expect(list.getByText("2.5 MB")).toBeVisible()
    expect(list.getByRole("link", { name: "Course docs" })).toHaveAttribute("href", "/docs/features/courses")

    cleanup()
    await renderCourses({ path: "/courses/the-walkthrough/billing" })

    const locked = within(screen.getByRole("region", { name: messages.lesson.materials.title }))
    expect(locked.getByText("Pricing sheet")).toBeVisible()
    expect(locked.queryByRole("link")).toBeNull()
    expect(locked.getByText(messages.lesson.materials.locked)).toBeInTheDocument()
  })
})
