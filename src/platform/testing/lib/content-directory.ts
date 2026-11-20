import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { onTestFinished } from "vite-plus/test"

export const createContentDirectory = (files: Readonly<Record<string, string>>): string => {
  const root = mkdtempSync(join(tmpdir(), "content-"))

  onTestFinished(() => {
    rmSync(root, { force: true, recursive: true })
  })
  for (const [path, source] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), source)
  }

  return root
}

export const mdx = (frontmatter: Readonly<Record<string, unknown>>, body = ""): string =>
  `---\n${Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n")}\n---\n\n${body}`
