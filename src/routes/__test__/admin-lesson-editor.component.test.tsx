import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { fill } from "~/src/platform/testing/lib/fill"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_QUERY_KEYS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import {
  LESSON_ATTACHMENT_KIND,
  LESSON_ATTACHMENT_MAX_BYTES,
  LESSON_ATTACHMENT_MUTATION_KEYS,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { UPLOAD_FIELDS } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import type { createLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/create-lesson-attachment"
import type { deleteLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/delete-lesson-attachment"
import type { moveLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/move-lesson-attachment"
import type { updateLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/update-lesson-attachment"
import type { uploadLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/upload-lesson-attachment"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_MUTATION_KEYS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import type { updateLessonMutation } from "~/src/modules/lesson/use-cases/update-lesson"
import { videoPlaybackQuery } from "~/src/modules/video/use-cases/get-video-playback"
import type { Video } from "~/src/modules/video/video.types"

import { Route as AdminCoursesRoute } from "~/src/routes/admin.courses"
import { Route as LessonEditorRoute } from "~/src/routes/admin.courses.$courseId_.lessons.$lessonId"

import validations from "~/messages/en-US/course.validations.json"
import errors from "~/messages/en-US/errors.json"
import locales from "~/messages/en-US/locales.json"
import labels from "~/messages/en-US/pages.admin.courses.json"
import adminLabels from "~/messages/en-US/pages.admin.json"
import type { RouterContext } from "~/src/router"

const mutations = vi.hoisted(() => ({
  createAttachment: vi.fn<NonNullable<typeof createLessonAttachmentMutation.mutationFn>>(),
  deleteAttachment: vi.fn<NonNullable<typeof deleteLessonAttachmentMutation.mutationFn>>(),
  moveAttachment: vi.fn<NonNullable<typeof moveLessonAttachmentMutation.mutationFn>>(),
  updateAttachment: vi.fn<NonNullable<typeof updateLessonAttachmentMutation.mutationFn>>(),
  updateLesson: vi.fn<NonNullable<typeof updateLessonMutation.mutationFn>>(),
  uploadAttachment: vi.fn<NonNullable<typeof uploadLessonAttachmentMutation.mutationFn>>(),
}))

vi.mock(import("~/src/modules/lesson/use-cases/update-lesson"), () => ({
  updateLessonMutation: { mutationFn: mutations.updateLesson, mutationKey: LESSON_MUTATION_KEYS.UPDATE },
}))
vi.mock(import("~/src/presentation/components/custom/video-player"), () => ({
  VideoPlayer: ({ playback }: { readonly playback: Video["playback"] }) => <div data-src={playback.src} data-testid="video-player" />,
}))
vi.mock(import("~/src/modules/lesson-attachment/use-cases/create-lesson-attachment"), () => ({
  createLessonAttachmentMutation: { mutationFn: mutations.createAttachment, mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/modules/lesson-attachment/use-cases/upload-lesson-attachment"), () => ({
  uploadLessonAttachmentMutation: { mutationFn: mutations.uploadAttachment, mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.UPLOAD },
}))
vi.mock(import("~/src/modules/lesson-attachment/use-cases/update-lesson-attachment"), () => ({
  updateLessonAttachmentMutation: { mutationFn: mutations.updateAttachment, mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.UPDATE },
}))
vi.mock(import("~/src/modules/lesson-attachment/use-cases/move-lesson-attachment"), () => ({
  moveLessonAttachmentMutation: { mutationFn: mutations.moveAttachment, mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.MOVE },
}))
vi.mock(import("~/src/modules/lesson-attachment/use-cases/delete-lesson-attachment"), () => ({
  deleteLessonAttachmentMutation: { mutationFn: mutations.deleteAttachment, mutationKey: LESSON_ATTACHMENT_MUTATION_KEYS.DELETE },
}))

const MESSAGES = getTestMessages("en-US")
const UPDATED_AT = new Date("2026-11-01T12:00:00Z")
const COURSE_ID = "01960000-0000-7000-8000-00000000c001"
const LESSON_ID = "lesson-boundaries"
const PATH = `/admin/courses/${COURSE_ID}/lessons/${LESSON_ID}`

const RECORDING: NonNullable<Course["editorLesson"]["video"]> = {
  captionLocales: ["en-US"],
  durationMs: 125_000,
  height: 1080,
  id: "video-recording",
  lessonCount: 1,
  sizeBytes: 48_000_000,
  title: "Boundaries take",
  width: 1920,
}

const PLAYBACK: Video["playback"] = {
  captions: [],
  poster: "/media/a.b/video-recording/poster.webp",
  posterSmall: "/media/a.b/video-recording/poster-960.webp",
  src: "/media/a.b/video-recording/master.m3u8",
  storyboard: "/media/a.b/video-recording/storyboard.vtt",
}

const FILE = {
  fileName: "slides.pdf",
  id: "attachment-file",
  kind: LESSON_ATTACHMENT_KIND.FILE,
  lessonId: LESSON_ID,
  position: 1,
  sizeBytes: 2_500_000,
  title: { "en-US": "Slides" },
} as const

const LINK = {
  id: "attachment-link",
  kind: LESSON_ATTACHMENT_KIND.LINK,
  lessonId: LESSON_ID,
  position: 2,
  title: { "en-US": "Course docs" },
  url: "/docs/features/courses",
} as const

const LESSON: Course["editorLesson"] = {
  access: LESSON_ACCESS.PREVIEW,
  attachments: [FILE, LINK],
  chapterId: "chapter-one",
  description: { "en-US": "Read the code." },
  format: LESSON_FORMAT.VIDEO,
  id: LESSON_ID,
  keyMoments: [{ label: { "en-US": "Install" }, seconds: 75 }],
  position: 1,
  slug: "boundaries",
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": "Start here." },
  title: { "en-US": "Boundaries" },
  video: RECORDING,
}

const editor = (lesson: Course["editorLesson"], status: Course["select"]["status"] = COURSE_STATUS.PUBLISHED): Course["editor"] => ({
  chapters: [{ id: "chapter-one", lessons: [lesson], position: 1, summary: {}, title: { "en-US": "Foundations" } }],
  course: {
    cover: null,
    createdAt: UPDATED_AT,
    icon: COURSE_ICON.ROCKET,
    id: COURSE_ID,
    kind: COURSE_KIND.COURSE,
    level: COURSE_LEVEL.BEGINNER,
    outcomes: {},
    position: 1,
    prerequisites: {},
    slug: "the-walkthrough",
    status,
    summary: { "en-US": "How it works." },
    title: { "en-US": "The walkthrough" },
    updatedAt: UPDATED_AT,
  },
})

const queryClients: QueryClient[] = []

const renderLessonEditor = async (data: Course["editor"] = editor(LESSON)) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${PATH}`))
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(courseEditorQuery({ courseId: COURSE_ID }).queryKey, data)
  queryClient.setQueryData(videoPlaybackQuery({ videoId: RECORDING.id }).queryKey, PLAYBACK)
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()

  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(AdminCoursesRoute.options, { getParentRoute: () => root, id: "/admin/courses", loader: () => ({}), path: "/admin/courses" })
  Object.assign(LessonEditorRoute.options, {
    getParentRoute: () => AdminCoursesRoute,
    id: "/$courseId_/lessons/$lessonId",
    loader: () => ({ locale: "en-US", pathname: PATH, title: "" }),
    path: "/$courseId/lessons/$lessonId",
  })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [PATH] }),
    rewrite: LOCALE_REWRITE,
    routeTree: root.addChildren([AdminCoursesRoute.addChildren([LessonEditorRoute])]),
  })
  queryClients.push(queryClient)
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={MESSAGES} timeZone={I18N.DEFAULT_TIMEZONE}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { invalidateQueries, user: userEvent.setup({ delay: null }) }
}

const chooseLanguage = async (user: ReturnType<typeof userEvent.setup>, locale: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: new RegExp(adminLabels.components.formLanguages.label, "u") }))
  await user.click(await screen.findByRole("option", { name: new RegExp(locale, "u") }))
}

const fillPolishInPanel = async (
  user: ReturnType<typeof userEvent.setup>,
  entries: readonly (readonly [string, string])[],
): Promise<void> => {
  await user.click(screen.getByRole("button", { name: adminLabels.components.formLanguages.panel.open }))
  const panel = await screen.findByRole("dialog", { name: adminLabels.components.formLanguages.panel.title })
  for (const [tab, text] of entries) {
    await user.click(within(panel).getByRole("tab", { name: new RegExp(`^${tab}`, "u") }))
    await user.click(within(panel).getByLabelText(locales["pl-PL"]))
    await user.paste(text)
  }
  await user.click(within(panel).getByRole("button", { name: adminLabels.components.formLanguages.panel.done }))
}

const card = (title: string): HTMLElement => {
  const element = screen.getByRole("heading", { level: 2, name: title }).closest("[data-slot=card]")
  if (!(element instanceof HTMLElement)) {
    throw new TypeError(`Missing card ${title}`)
  }
  return element
}

const openMaterialMenu = async (user: ReturnType<typeof userEvent.setup>, title: string, item: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: `Actions for ${title}` }))
  await user.click(await screen.findByRole("menuitem", { name: item }))
}

const materialTitles = (): string[] =>
  within(screen.getByRole("grid", { name: labels.materials.title }))
    .getAllByRole("row")
    .map((row) => row.querySelector("p")?.textContent ?? "")

const dragMaterial = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  steps: readonly (readonly [string, string])[],
): Promise<void> => {
  const row = screen.getByRole("row", { name })
  act(() => {
    row.focus()
  })
  await user.keyboard("{ArrowRight}")
  await user.keyboard("{Enter}")
  for (const [key, target] of steps) {
    await user.keyboard(key)
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute("aria-label", target)
    })
  }
  await user.keyboard("{Enter}")
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  mutations.updateLesson.mockResolvedValue({ id: LESSON_ID })
  mutations.createAttachment.mockResolvedValue({ id: "attachment-new" })
  mutations.uploadAttachment.mockResolvedValue({ id: "attachment-upload" })
  mutations.updateAttachment.mockResolvedValue({ id: FILE.id })
  mutations.moveAttachment.mockResolvedValue({ attachmentId: LINK.id })
  mutations.deleteAttachment.mockResolvedValue({ id: FILE.id })
})

afterEach(() => {
  cleanup()
  for (const queryClient of queryClients) {
    queryClient.clear()
  }
  queryClients.length = 0
  vi.restoreAllMocks()
})

describe("lesson editor", () => {
  it("shows the lesson, its video and its materials, and links to the public lesson", async () => {
    await renderLessonEditor()

    expect(screen.getByRole("heading", { level: 1, name: "Boundaries" })).toBeVisible()
    expect(screen.getByRole("link", { name: "The walkthrough" })).toHaveAttribute("href", `/admin/courses/${COURSE_ID}`)
    expect(screen.getByRole("link", { name: labels.lessonEditor.view })).toHaveAttribute("href", "/courses/the-walkthrough/boundaries")
    expect(screen.getByLabelText(labels.lesson.title)).toHaveValue("Boundaries")
    expect(screen.getByLabelText(labels.lessonEditor.description)).toHaveValue("Read the code.")
    expect(screen.getByLabelText("Time of moment 1")).toHaveValue("1:15")
    const videoCard = within(card(labels.lessonEditor.video.title))
    expect(videoCard.getByText(RECORDING.title, { selector: "p" })).toBeVisible()
    expect(videoCard.getByText(labels.lessonEditor.video.ready)).toBeVisible()
    expect(await videoCard.findByTestId("video-player")).toHaveAttribute("data-src", PLAYBACK.src)
    const materials = within(card(labels.materials.title))
    expect(materials.getByText("Slides")).toBeVisible()
    expect(materials.getByText("slides.pdf · 2.5 MB")).toBeVisible()
    expect(materials.getByText("/docs/features/courses")).toBeVisible()
  })

  it("links to the public lesson only once the course and the lesson are published", async () => {
    await renderLessonEditor(editor(LESSON, COURSE_STATUS.DRAFT))
    expect(screen.queryByRole("link", { name: labels.lessonEditor.view })).toBeNull()

    cleanup()
    await renderLessonEditor(editor({ ...LESSON, attachments: [], status: LESSON_STATUS.DRAFT }))
    expect(screen.queryByRole("link", { name: labels.lessonEditor.view })).toBeNull()
    expect(within(card(labels.materials.title)).getByText(labels.materials.empty)).toBeVisible()
  })

  it("shows the not-found page when the lesson is no longer in the course", async () => {
    await renderLessonEditor(editor({ ...LESSON, id: "another-lesson" }))

    expect(screen.queryByRole("heading", { level: 1, name: "Boundaries" })).toBeNull()
  })

  it("saves the text, a previewed description and the key moments in every language", async () => {
    const { invalidateQueries, user } = await renderLessonEditor()

    await user.clear(screen.getByLabelText(labels.lessonEditor.description))
    await fill(user, screen.getByLabelText(labels.lessonEditor.description), "Run `bun run dev`.\n\nThen open the site.")
    const preview = within(screen.getByRole("region", { name: labels.lessonEditor.descriptionPreview }))
    expect(preview.getByText("bun run dev", { selector: "code" })).toBeVisible()
    expect(preview.getByText("Then open the site.")).toBeVisible()
    await user.click(screen.getByRole("button", { name: labels.lessonEditor.keyMoments.add }))
    await fill(user, screen.getByLabelText("Time of moment 2"), "12")
    await user.click(screen.getByRole("button", { name: labels.lesson.save }))
    expect(await screen.findByText(validations.timeInvalid)).toBeVisible()
    expect(mutations.updateLesson).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText("Time of moment 2"))
    await fill(user, screen.getByLabelText("Time of moment 2"), "0:30")
    await fill(user, screen.getByLabelText("Label of moment 2"), "Clone")
    await chooseLanguage(user, "pl-PL")
    await fill(user, screen.getByLabelText("Label of moment 1"), "Instalacja")
    await user.click(screen.getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.lessonEditor.saved)
    })
    expect(mutations.updateLesson).toHaveBeenCalledWith(
      {
        access: LESSON_ACCESS.PREVIEW,
        description: { "en-US": "Run `bun run dev`.\n\nThen open the site." },
        keyMoments: [
          { at: "1:15", label: { "en-US": "Install", "pl-PL": "Instalacja" } },
          { at: "0:30", label: { "en-US": "Clone" } },
        ],
        lessonId: LESSON_ID,
        slug: "boundaries",
        status: LESSON_STATUS.PUBLISHED,
        summary: { "en-US": "Start here." },
        title: { "en-US": "Boundaries" },
      },
      expect.anything(),
    )
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
  })

  it("fills the title and the description of another language in the all-languages panel", async () => {
    const { user } = await renderLessonEditor()

    await fillPolishInPanel(user, [
      [labels.lesson.title, "Granice"],
      [labels.lessonEditor.description, "Opis."],
    ])
    await user.click(screen.getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(mutations.updateLesson).toHaveBeenCalledWith(
        expect.objectContaining({
          description: { "en-US": "Read the code.", "pl-PL": "Opis." },
          title: { "en-US": "Boundaries", "pl-PL": "Granice" },
        }),
        expect.anything(),
      )
    })
  })

  it("starts an empty description in a language that has none", async () => {
    const { user } = await renderLessonEditor()

    await chooseLanguage(user, "pl-PL")

    expect(screen.getByLabelText(labels.lessonEditor.description)).toHaveValue("")
    expect(screen.queryByRole("region", { name: labels.lessonEditor.descriptionPreview })).toBeNull()
  })

  it("removes a key moment and explains a failed save", async () => {
    mutations.updateLesson.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    const { user } = await renderLessonEditor()

    await user.click(screen.getByRole("button", { name: "Remove moment 1" }))
    expect(screen.getByText(labels.lessonEditor.keyMoments.empty)).toBeVisible()
    await user.click(screen.getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
    expect(mutations.updateLesson).toHaveBeenCalledWith(expect.objectContaining({ keyMoments: [] }), expect.anything())
  })

  it("refuses a slug another lesson of the course uses on the slug field", async () => {
    mutations.updateLesson.mockRejectedValueOnce(new Error(ERROR_CODES.CONFLICT))
    const { user } = await renderLessonEditor()

    await user.click(screen.getByRole("button", { name: labels.lesson.save }))

    expect(await screen.findByText(validations.lessonSlugTaken)).toBeVisible()
    expect(screen.getByLabelText(labels.lesson.slug)).toHaveAttribute("aria-invalid", "true")
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe("new lesson materials", () => {
  it("uploads a file with a title after checking that one is chosen", async () => {
    const { user } = await renderLessonEditor()

    await user.click(screen.getByRole("button", { name: labels.materials.uploadFile }))
    const dialog = within(await screen.findByRole("dialog"))
    await fill(user, dialog.getByLabelText(labels.materials.titleLabel), "Workbook")
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))
    expect(await dialog.findByText(validations.fileRequired)).toBeVisible()

    const input = screen.getByRole("dialog").querySelector<HTMLInputElement>("input[type=file]")
    if (input === null) {
      throw new Error("Missing file input")
    }
    await user.upload(input, new File([new Uint8Array(1500)], "workbook.pdf", { type: "application/pdf" }))
    expect(dialog.getByText("workbook.pdf · 1.5 kB")).toBeVisible()
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.materials.saved)
    })
    const [form] = mutations.uploadAttachment.mock.calls[0] ?? []
    expect(form).toBeInstanceOf(FormData)
    expect(form?.get(UPLOAD_FIELDS.LESSON_ID)).toBe(LESSON_ID)
    expect(form?.get(`${UPLOAD_FIELDS.TITLE}.en-US`)).toBe("Workbook")
    expect(form?.get(UPLOAD_FIELDS.FILE)).toBeInstanceOf(File)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("explains an upload that failed and keeps the dialog open", async () => {
    mutations.uploadAttachment.mockRejectedValueOnce(new Error(ERROR_CODES.TOO_MANY_REQUESTS))
    const { user } = await renderLessonEditor()

    await user.click(screen.getByRole("button", { name: labels.materials.uploadFile }))
    const dialog = within(await screen.findByRole("dialog"))
    await fill(user, dialog.getByLabelText(labels.materials.titleLabel), "Workbook")
    const input = screen.getByRole("dialog").querySelector<HTMLInputElement>("input[type=file]")
    if (input === null) {
      throw new Error("Missing file input")
    }
    await user.upload(input, new File(["%PDF"], "workbook.pdf", { type: "application/pdf" }))
    await fillPolishInPanel(user, [[labels.materials.titleLabel, "Zeszyt"]])
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.TOO_MANY_REQUESTS)
    })
    expect(mutations.uploadAttachment.mock.calls[0]?.[0].get(`${UPLOAD_FIELDS.TITLE}.pl-PL`)).toBe("Zeszyt")
    expect(screen.getByRole("dialog")).toBeVisible()
  })

  it("refuses a file over the size limit before uploading it", async () => {
    const { user } = await renderLessonEditor()

    await user.click(screen.getByRole("button", { name: labels.materials.uploadFile }))
    const dialog = within(await screen.findByRole("dialog"))
    await fill(user, dialog.getByLabelText(labels.materials.titleLabel), "Huge")
    const input = screen.getByRole("dialog").querySelector<HTMLInputElement>("input[type=file]")
    if (input === null) {
      throw new Error("Missing file input")
    }
    await user.upload(input, new File([new Uint8Array(LESSON_ATTACHMENT_MAX_BYTES + 1)], "huge.zip", { type: "application/zip" }))
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))

    expect(await dialog.findByText(validations.fileTooLarge.replace("{max}", "25"))).toBeVisible()
    expect(mutations.uploadAttachment).not.toHaveBeenCalled()
  })

  it("adds a link after checking its address", async () => {
    const { user } = await renderLessonEditor()

    await user.click(screen.getByRole("button", { name: labels.materials.addLink }))
    const dialog = within(await screen.findByRole("dialog"))
    await fill(user, dialog.getByLabelText(labels.materials.titleLabel), "Source")
    await fill(user, dialog.getByLabelText(labels.materials.url), "http://example.com")
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))
    expect(await dialog.findByText(validations.urlInvalid)).toBeVisible()

    await user.clear(dialog.getByLabelText(labels.materials.url))
    await fill(user, dialog.getByLabelText(labels.materials.url), "https://github.com/saasyland/cli")
    await fillPolishInPanel(user, [[labels.materials.titleLabel, "Kod"]])
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))

    await waitFor(() => {
      expect(mutations.createAttachment).toHaveBeenCalledWith(
        { lessonId: LESSON_ID, title: { "en-US": "Source", "pl-PL": "Kod" }, url: "https://github.com/saasyland/cli" },
        expect.anything(),
      )
    })
  })

  it("explains a link that could not be added", async () => {
    mutations.createAttachment.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    const { user } = await renderLessonEditor()

    await user.click(screen.getByRole("button", { name: labels.materials.addLink }))
    const dialog = within(await screen.findByRole("dialog"))
    await fill(user, dialog.getByLabelText(labels.materials.titleLabel), "Docs")
    await fill(user, dialog.getByLabelText(labels.materials.url), "/docs")
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
  })
})

describe("lesson material changes", () => {
  it("renames a file", async () => {
    const { invalidateQueries, user } = await renderLessonEditor()

    await openMaterialMenu(user, "Slides", labels.materials.edit)
    const dialog = within(await screen.findByRole("dialog"))
    await user.clear(dialog.getByLabelText(labels.materials.titleLabel))
    await fill(user, dialog.getByLabelText(labels.materials.titleLabel), "Deck")
    await fillPolishInPanel(user, [[labels.materials.titleLabel, "Slajdy"]])
    await user.click(dialog.getByRole("button", { name: labels.materials.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.materials.saved)
    })
    expect(mutations.updateAttachment).toHaveBeenCalledWith(
      { attachmentId: FILE.id, title: { "en-US": "Deck", "pl-PL": "Slajdy" } },
      expect.anything(),
    )
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  it("edits a link, renames a file and explains a failure", async () => {
    const { user } = await renderLessonEditor()

    await openMaterialMenu(user, "Course docs", labels.materials.edit)
    const linkDialog = within(await screen.findByRole("dialog"))
    expect(linkDialog.getByLabelText(labels.materials.url)).toHaveValue(LINK.url)
    await user.clear(linkDialog.getByLabelText(labels.materials.url))
    await fill(user, linkDialog.getByLabelText(labels.materials.url), "/docs")
    await user.click(linkDialog.getByRole("button", { name: labels.materials.save }))
    await waitFor(() => {
      expect(mutations.updateAttachment).toHaveBeenCalledWith({ attachmentId: LINK.id, title: LINK.title, url: "/docs" }, expect.anything())
    })

    mutations.updateAttachment.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    await openMaterialMenu(user, "Slides", labels.materials.edit)
    const fileDialog = within(await screen.findByRole("dialog"))
    expect(fileDialog.queryByLabelText(labels.materials.url)).toBeNull()
    await user.clear(fileDialog.getByLabelText(labels.materials.titleLabel))
    await fill(user, fileDialog.getByLabelText(labels.materials.titleLabel), "Deck")
    await user.click(fileDialog.getByRole("button", { name: labels.materials.save }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
    expect(mutations.updateAttachment).toHaveBeenLastCalledWith({ attachmentId: FILE.id, title: { "en-US": "Deck" } }, expect.anything())
  })

  it("moves a material by its handle with the keyboard and saves its new place", async () => {
    const { user } = await renderLessonEditor()

    expect(screen.getByText(labels.materials.reorderHint)).toBeVisible()
    await dragMaterial(user, "Course docs", [
      ["{ArrowUp}", "Insert between Slides and Course docs"],
      ["{ArrowUp}", "Insert before Slides"],
    ])

    await waitFor(() => {
      expect(mutations.moveAttachment).toHaveBeenCalledWith({ attachmentId: LINK.id, position: 1 }, expect.anything())
    })
    expect(materialTitles()).toStrictEqual(["Course docs", "Slides"])
  })

  it("puts a material back when its move fails", async () => {
    mutations.moveAttachment.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    const { user } = await renderLessonEditor()

    await dragMaterial(user, "Slides", [["{ArrowDown}", "Insert after Course docs"]])

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
    expect(mutations.moveAttachment).toHaveBeenCalledWith({ attachmentId: FILE.id, position: 2 }, expect.anything())
    await waitFor(() => {
      expect(materialTitles()).toStrictEqual(["Slides", "Course docs"])
    })
  })

  it("deletes a material from its menu after confirmation and refreshes the lesson", async () => {
    const { invalidateQueries, user } = await renderLessonEditor()

    await openMaterialMenu(user, "Course docs", labels.materials.delete)
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: labels.materials.delete }))

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
    })
    expect(mutations.deleteAttachment).toHaveBeenCalledWith({ attachmentId: LINK.id }, expect.anything())
  })

  it("deletes a material from its menu after confirmation and explains a failure", async () => {
    mutations.deleteAttachment.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    const { user } = await renderLessonEditor()

    await openMaterialMenu(user, "Slides", labels.materials.delete)
    const confirm = within(await screen.findByRole("alertdialog"))
    expect(confirm.getByText(labels.materials.deleteBody.replace("{title}", "Slides"))).toBeVisible()
    await user.click(confirm.getByRole("button", { name: labels.materials.delete }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
    expect(mutations.deleteAttachment).toHaveBeenCalledWith({ attachmentId: FILE.id }, expect.anything())
  })
})
