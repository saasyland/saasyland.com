import browserCollections from "collections/browser"

import { mdxComponents } from "~/src/presentation/components/custom/mdx"

export const blogContent = browserCollections.blog.createClientLoader({
  component: ({ default: Mdx }) => <Mdx components={mdxComponents} />,
  id: "blog",
})
