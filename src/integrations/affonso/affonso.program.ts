import { env } from "cloudflare:workers"

import { createServerFn } from "@tanstack/react-start"

export const getAffonsoProgramId = createServerFn({ method: "GET" }).handler(() => env.AFFONSO_PROGRAM_ID)
