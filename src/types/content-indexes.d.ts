declare module "virtual:content-indexes" {
  type SupportedLocale = import("~/src/integrations/use-intl/i18n.config").SupportedLocale
  export const loadDocsIndex: (locale: SupportedLocale) => Promise<import("~/src/integrations/fumadocs/fumadocs.indexes").DocsIndex>
  export const loadBlogIndex: (locale: SupportedLocale) => Promise<import("~/src/integrations/fumadocs/fumadocs.indexes").BlogIndex>
}

declare module "virtual:docs-search" {
  export const SEARCH_INDEXES: Readonly<Record<import("~/src/integrations/use-intl/i18n.config").SupportedLocale, string>>
}
