import { Suspense } from "react"

import { screen } from "@testing-library/react"
import { expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { blogContent } from "~/src/presentation/components/custom/blog-content"

vi.mock("collections/browser", async () => {
  const { createClientLoader } = await import("fumadocs-mdx/runtime/browser")
  const { createElement } = await import("react")
  const document = { default: () => createElement("p", null, "Compiled MDX body"), frontmatter: { title: "Post" }, toc: [] }
  const entries = { "post.mdx": () => Promise.resolve(document) }
  return {
    default: {
      blog: {
        createClientLoader: (options: Parameters<typeof createClientLoader<typeof document>>[1]) => createClientLoader(entries, options),
      },
    },
  }
})

const BlogContent = () => blogContent.useContent("post.mdx")

it("renders blog MDX through the shared component map", async () => {
  await blogContent.preload("post.mdx")
  renderWithRouter(
    <Suspense>
      <BlogContent />
    </Suspense>,
  )
  expect(await screen.findByText("Compiled MDX body")).toBeInTheDocument()
})
