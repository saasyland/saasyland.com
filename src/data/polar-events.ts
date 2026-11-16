import type { models, webhooks } from "@polar-sh/sdk/2026-10"

import * as AREA_POLAR_EVENTS from "~/src/data/polar-events.entries"

export interface PolarEventHandler {
  readonly events: readonly models.WebhookEventType[]
  readonly handle: (event: webhooks.WebhookPayload) => Promise<void>
}

const AREAS: Readonly<Record<string, readonly PolarEventHandler[]>> = AREA_POLAR_EVENTS

const HANDLERS = Object.values(AREAS).flat()

export const POLAR_EVENTS = [...new Set(HANDLERS.flatMap(({ events }) => events))].toSorted()

export const handlePolarEvent = async (event: webhooks.WebhookPayload): Promise<void> => {
  await Promise.all(HANDLERS.filter(({ events }) => events.includes(event.type)).map(({ handle }) => handle(event)))
}
