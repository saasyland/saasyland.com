import { Glob } from "bun"

export const CLIENT_DIR = "dist/client"

export const listPrerenderedPages = (): string[] => {
  const pages = [...new Glob("**/index.html").scanSync(CLIENT_DIR)].toSorted()

  if (pages.length === 0) {
    throw new Error(`No prerendered pages found under ${CLIENT_DIR}.`)
  }

  return pages
}
