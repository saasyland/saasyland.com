import * as AREA_DEPLOY_CHECKS from "~/src/data/deploy.entries"

const AREAS: Readonly<Record<string, readonly string[]>> = AREA_DEPLOY_CHECKS

export const DEPLOY_CHECKS = Object.values(AREAS).flat()
