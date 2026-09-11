import browserCollections from "collections/browser"

import { getMDXComponents } from "~/src/integrations/fumadocs/mdx"

export const blogLoader = browserCollections.blog.createClientLoader({
  component: ({ default: Mdx }) => <Mdx components={getMDXComponents()} />,
  id: "blog",
})
