import { isRequestRenderedRoute } from "../routes.ts"

const LOCALE_PREFIX = /^\/[a-z]{2}-[A-Z]{2}(?=\/|$)/u
const FILE_EXTENSION = /\.\w+$/u

export const shouldPrerender = ({ path }: { path: string }): boolean => {
  if (path.includes("?") || path.includes("#") || FILE_EXTENSION.test(path)) {
    return false
  }

  return !isRequestRenderedRoute(path.replace(LOCALE_PREFIX, ""))
}
