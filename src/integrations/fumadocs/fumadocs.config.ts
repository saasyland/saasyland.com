import { defineCollections, defineConfig, defineDocs } from "fumadocs-mdx/config"

import { changelogEntries } from "./fumadocs.changelog"
import { blogSchema } from "./fumadocs.schema"

export const docs = defineDocs({
  dir: "./content/docs",
  docs: { async: true },
})

export const blog = defineCollections({
  async: true,
  dir: "./content/blog",
  schema: blogSchema,
  type: "doc",
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      colorReplacements: {
        "github-dark": { "#6a737d": "#78828c" },
        "github-light": { "#e36209": "#c55300" },
      },
      themes: { dark: "github-dark", light: "github-light" },
    },
  },
  plugins: [changelogEntries],
})
