import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { coverObjectKeys } from "~/src/modules/course/course.cover"

export const removeCoverObjects = async (cover: string | null): Promise<void> => {
  if (cover !== null) {
    await env.MEDIA.delete(coverObjectKeys(cover))
  }
}
