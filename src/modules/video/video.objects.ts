import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { videoDirectory } from "~/src/modules/video/video.files"

const removeObjects = async (prefix: string): Promise<void> => {
  const page = await env.MEDIA.list({ prefix })
  if (page.objects.length === 0) {
    return
  }

  await env.MEDIA.delete(page.objects.map((object) => object.key))

  if (page.truncated) {
    await removeObjects(prefix)
  }
}

export const removeVideoObjects = (videoId: string): Promise<void> => removeObjects(videoDirectory(videoId))
