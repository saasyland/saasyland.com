import type { Session } from "~/src/modules/session/session.types"

export type AuthActiveSession = Pick<Session["select"], "createdAt" | "expiresAt" | "id" | "ipAddress" | "updatedAt" | "userAgent">
