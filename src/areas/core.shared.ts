import type { SharedArea } from "./shared.ts"

export const API = "/api"
export const HOME = "/"

export const CORE_SHARED = { unlisted: [API] } as const satisfies SharedArea
