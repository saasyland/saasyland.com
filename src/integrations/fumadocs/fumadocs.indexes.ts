import { getBreadcrumbItems } from "fumadocs-core/breadcrumb"
import { frontmatter } from "fumadocs-core/content/md/frontmatter"
import { getTableOfContents } from "fumadocs-core/content/toc"
import { structure } from "fumadocs-core/mdx-plugins/remark-structure"
import type { Folder, Root } from "fumadocs-core/page-tree"
import { createSearchAPI } from "fumadocs-core/search/server"
import { type StaticSource, loader } from "fumadocs-core/source"
import { metaSchema, pageSchema } from "fumadocs-core/source/schema"
import { globSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import remarkMdx from "remark-mdx"
import zod from "zod/v4"

import { listChangelogEntries } from "~/src/integrations/fumadocs/fumadocs.changelog"
import { i18n } from "~/src/integrations/fumadocs/fumadocs.i18n"
import { docsIcon } from "~/src/integrations/fumadocs/fumadocs.icons"
import { blogSchema } from "~/src/integrations/fumadocs/fumadocs.schema"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ROUTES } from "~/src/routes"

export const DOCS_DIRECTORY = "content/docs"
export const BLOG_DIRECTORY = "content/blog"

const DOCS_FILES = "**/*.{json,mdx}"
const BLOG_FILES = "*.mdx"
const META_FILE = ".json"
const SLUG_SEPARATOR = "/"
const WORDS_PER_MINUTE = 220
const PARENT_BREADCRUMB_INDEX = -1
const MDX_PLUGINS = [remarkMdx]

const sectionSchema = zod.string().optional()
const tocSchema = zod.array(zod.object({ depth: zod.number(), title: zod.string(), url: zod.string() }))

interface ContentFile {
  readonly path: string
  readonly source: string
}

interface Content {
  readonly content: string
}

type MetaFileData = zod.infer<typeof metaSchema>

type DocsPageData = Content & zod.infer<typeof pageSchema>

type BlogPageData = Content & zod.infer<typeof blogSchema>

const readContent = ({ directory, pattern, root }: { directory: string; pattern: string; root: string }): Promise<ContentFile[]> =>
  Promise.all(
    globSync(pattern, { cwd: join(root, directory) })
      .toSorted()
      .map(async (path) => ({ path, source: await readFile(join(root, directory, path), "utf8") })),
  )

const toDocsFile = ({ path, source }: ContentFile): StaticSource<{ metaData: MetaFileData; pageData: DocsPageData }>["files"][number] => {
  if (path.endsWith(META_FILE)) {
    return { data: metaSchema.parse(JSON.parse(source)), path, type: "meta" }
  }

  const { content, data } = frontmatter(source)

  return { data: { ...pageSchema.parse(data), content }, path, type: "page" }
}

const toBlogFile = ({ path, source }: ContentFile): StaticSource<{ metaData: MetaFileData; pageData: BlogPageData }>["files"][number] => {
  const { content, data } = frontmatter(source)

  return { data: { ...blogSchema.parse(data), content }, path, type: "page" }
}

const createDocsSource = async (root: string) => {
  const files = await readContent({ directory: DOCS_DIRECTORY, pattern: DOCS_FILES, root })

  return loader({ baseUrl: ROUTES.DOCS, i18n, icon: docsIcon, source: { files: files.map((file) => toDocsFile(file)) } })
}

const createBlogSource = async (root: string) => {
  const files = await readContent({ directory: BLOG_DIRECTORY, pattern: BLOG_FILES, root })

  return loader({ baseUrl: ROUTES.BLOG, i18n, source: { files: files.map((file) => toBlogFile(file)) } })
}

type DocsSource = Awaited<ReturnType<typeof createDocsSource>>

type BlogSource = Awaited<ReturnType<typeof createBlogSource>>

const toDate = (date: Date | string): string => (typeof date === "string" ? date : date.toISOString())

export const readingTimeMinutes = ({ content, locale }: { content: string; locale: SupportedLocale }): number => {
  const segmenter = new Intl.Segmenter(locale, { granularity: "word" })
  const words = structure(content, MDX_PLUGINS)
    .contents.flatMap((record) => Array.from(segmenter.segment(record.content), ({ isWordLike }) => isWordLike))
    .filter((isWordLike) => isWordLike === true)

  return Math.max(1, Math.round(words.length / WORDS_PER_MINUTE))
}

export const tableOfContents = async (content: string) => tocSchema.parse(await getTableOfContents(content, MDX_PLUGINS))

const buildDocsIndex = async (source: DocsSource, locale: SupportedLocale) => {
  const tree = source.getPageTree(locale)

  return {
    pages: Object.fromEntries(
      source.getPages(locale).map((page) => [
        page.slugs.join(SLUG_SEPARATOR),
        {
          description: page.data.description ?? "",
          locale,
          path: page.path,
          pathname: page.url,
          section: sectionSchema.parse(getBreadcrumbItems(page.url, tree).at(PARENT_BREADCRUMB_INDEX)?.name),
          title: page.data.title,
        },
      ]),
    ),
    tree: await source.serializePageTree(tree),
  }
}

export type DocsIndex = Awaited<ReturnType<typeof buildDocsIndex>>

export type DocsPage = DocsIndex["pages"][string]

const buildBlogIndex = (source: BlogSource, locale: SupportedLocale) =>
  Promise.all(
    source
      .getPages(locale)
      .filter((page) => page.data.published)
      .toSorted((first, second) => new Date(second.data.date).getTime() - new Date(first.data.date).getTime())
      .map(async ({ data, path, url }) => ({
        authorImage: data.authorImage,
        authorName: data.authorName,
        authorUrl: data.authorUrl,
        date: toDate(data.date),
        description: data.description,
        faq: data.faq,
        image: data.image,
        path,
        readingTimeMinutes: readingTimeMinutes({ content: data.content, locale }),
        summary: data.excerpt ?? data.description,
        tags: data.tags ?? [],
        title: data.title,
        toc: await tableOfContents(data.content),
        updated: data.updated === undefined ? undefined : toDate(data.updated),
        url,
      })),
  )

export type BlogIndex = Awaited<ReturnType<typeof buildBlogIndex>>

export type BlogPost = BlogIndex[number]

const withName = (path: readonly string[], name: unknown): readonly string[] =>
  typeof name === "string" && name.length > 0 ? [...path, name] : path

export const collectBreadcrumbs = (
  folder: Folder | Root,
  parents: readonly string[] = [],
  breadcrumbs = new Map<string, readonly string[]>(),
): ReadonlyMap<string, readonly string[]> => {
  const path = withName(parents, folder.name)
  if (folder.type === "folder" && folder.index && !breadcrumbs.has(folder.index.url)) {
    breadcrumbs.set(folder.index.url, path)
  }
  let current = path
  for (const node of folder.children) {
    if (node.type === "separator") {
      current = withName(path, node.name)
    } else if (node.type === "folder") {
      collectBreadcrumbs(node, current, breadcrumbs)
    } else if (!breadcrumbs.has(node.url)) {
      breadcrumbs.set(node.url, current)
    }
  }

  return breadcrumbs
}

const buildSearchIndex = async ({ locale, root, source }: { locale: SupportedLocale; root: string; source: DocsSource }) => {
  const breadcrumbs = collectBreadcrumbs(source.getPageTree(locale))
  const indexes = await Promise.all(
    source.getPages(locale).map(async (page) => ({
      breadcrumbs: [...(breadcrumbs.get(page.url) ?? [])],
      description: page.data.description ?? "",
      id: page.url,
      structuredData: structure(await listChangelogEntries({ cwd: root, path: page.path, source: page.data.content }), MDX_PLUGINS),
      title: page.data.title,
      url: page.url,
    })),
  )

  return createSearchAPI("advanced", { indexes }).export()
}

export const createContentIndexes = async (root: string) => {
  const [docs, blog] = await Promise.all([createDocsSource(root), createBlogSource(root)])

  return {
    blog: (locale: SupportedLocale) => buildBlogIndex(blog, locale),
    docs: (locale: SupportedLocale) => buildDocsIndex(docs, locale),
    locales: I18N.SUPPORTED_LOCALES,
    search: (locale: SupportedLocale) => buildSearchIndex({ locale, root, source: docs }),
  }
}

export type ContentIndexes = Awaited<ReturnType<typeof createContentIndexes>>
