import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { deleteVideoMutation } from "~/src/modules/video/use-cases/delete-video"
import { videoPlaybackQuery } from "~/src/modules/video/use-cases/get-video-playback"
import { getVideosQuery } from "~/src/modules/video/use-cases/get-videos"
import { VIDEO_MUTATION_KEYS, VIDEO_QUERY_KEYS } from "~/src/modules/video/video.constants"
import type { Video } from "~/src/modules/video/video.types"

import { Route as VideosRoute } from "~/src/routes/admin.videos"

import { adminQueryClient, fixtureDate, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"

import errors from "~/messages/en-US/errors.json"
import labels from "~/messages/en-US/pages.admin.videos.json"

const remove = vi.hoisted(() => vi.fn<NonNullable<typeof deleteVideoMutation.mutationFn>>())

vi.mock(import("~/src/modules/video/use-cases/delete-video"), () => ({
  deleteVideoMutation: { mutationFn: remove, mutationKey: VIDEO_MUTATION_KEYS.DELETE },
}))

vi.mock(import("~/src/presentation/components/custom/video-player"), () => ({
  VideoPlayer: ({ playback, title }: { readonly playback: Video["playback"]; readonly title: string }) => (
    <div data-src={playback.src} data-testid="video-player">
      {title}
    </div>
  ),
}))

const LESSON: Video["select"] = {
  captionLocales: ["en-US", "pl-PL"],
  createdAt: fixtureDate,
  durationMs: 754_000,
  height: 1080,
  id: "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b",
  sizeBytes: 123_400_000,
  title: "Module boundaries",
  updatedAt: fixtureDate,
  width: 1920,
}

const SILENT: Video["select"] = {
  ...LESSON,
  captionLocales: [],
  durationMs: 3_725_000,
  id: "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6c",
  title: "Long build",
}

const PLAYBACK: Video["playback"] = {
  captions: [],
  poster: "/media/a.b/id/poster.webp",
  posterSmall: "/media/a.b/id/poster-960.webp",
  src: "/media/a.b/id/master.m3u8",
  storyboard: "/media/a.b/id/storyboard.vtt",
}

const renderVideos = () => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getVideosQuery.queryKey, { rows: [LESSON, SILENT], total: 2 })
  queryClient.setQueryData(videoPlaybackQuery({ videoId: LESSON.id }).queryKey, PLAYBACK)
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const Page = VideosRoute.options.component
  if (!Page) {
    throw new Error("Missing videos page")
  }
  return { ...renderAdmin(<Page />, { path: "/admin/videos", queryClient }), invalidateQueries, user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  remove.mockResolvedValue({ id: LESSON.id })
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("admin videos", () => {
  it("lists each video with its length, source size, storage and captions", () => {
    renderVideos()

    const row = screen.getByText(LESSON.title).closest("tr")
    if (!row) {
      throw new Error("Missing video row")
    }

    expect(screen.getByRole("heading", { level: 1, name: labels.title })).toBeVisible()
    expect(within(row).getByText(LESSON.id)).toBeVisible()
    expect(within(row).getByText("12:34")).toBeVisible()
    expect(within(row).getByText("1920×1080")).toBeVisible()
    expect(within(row).getByText("123.4 MB")).toBeVisible()
    expect(within(row).getByText("en-US")).toBeVisible()
    expect(within(row).getByText("pl-PL")).toBeVisible()
    expect(within(row).getByText("Jan 1, 2025")).toBeVisible()
    expect(screen.getByText("1:02:05")).toBeVisible()
    expect(screen.getByText(labels.table.noCaptions)).toBeVisible()
  })

  it("previews a video in a dialog with a signed stream", async () => {
    const { user } = renderVideos()

    await user.click(screen.getByRole("button", { name: `Preview ${LESSON.title}` }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("heading", { name: LESSON.title })).toBeVisible()
    expect(await within(dialog).findByTestId("video-player")).toHaveAttribute("data-src", PLAYBACK.src)
  })

  it("shows a placeholder while the signed stream loads", async () => {
    const { user } = renderVideos()

    await user.click(screen.getByRole("button", { name: `Preview ${SILENT.title}` }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).queryByTestId("video-player")).toBeNull()
  })

  it("deletes a video after confirmation and refreshes the list", async () => {
    const { invalidateQueries, user } = renderVideos()

    await user.click(screen.getByRole("button", { name: `Delete ${LESSON.title}` }))
    const confirm = await screen.findByRole("alertdialog")
    expect(
      within(confirm).getByText(`“${LESSON.title}” and every file encoded from it are removed from R2. This cannot be undone.`),
    ).toBeVisible()
    await user.click(within(confirm).getByRole("button", { name: labels.delete.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(`“${LESSON.title}” was deleted`)
    })
    expect(remove).toHaveBeenCalledWith({ videoId: LESSON.id }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: VIDEO_QUERY_KEYS.ALL })
  })

  it("keeps the video when the deletion is cancelled", async () => {
    const { user } = renderVideos()

    await user.click(screen.getByRole("button", { name: `Delete ${LESSON.title}` }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: labels.delete.cancel }))

    expect(remove).not.toHaveBeenCalled()
  })

  it("explains a failed deletion", async () => {
    remove.mockRejectedValueOnce(new Error("NOT_FOUND"))
    const { user } = renderVideos()

    await user.click(screen.getByRole("button", { name: `Delete ${LESSON.title}` }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: labels.delete.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
  })

  it("shows the commands that publish a recording", () => {
    renderVideos()

    expect(screen.getByRole("heading", { name: labels.publish.title })).toBeVisible()
    expect(screen.getByText("brew install ffmpeg")).toBeVisible()
    expect(screen.getByText('bun run video:publish:production recording.mp4 --title "Lesson 01"')).toBeVisible()
    expect(screen.getAllByRole("button", { name: labels.publish.copy })).toHaveLength(3)
  })
})
