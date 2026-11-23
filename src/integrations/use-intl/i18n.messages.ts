import { type QueryClient, queryOptions } from "@tanstack/react-query"
import { type AbstractIntlMessages, createTranslator } from "use-intl"
import zod from "zod/v4"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { APP_NAME } from "~/src/presentation/branding"

type MessageTree = Record<string, AbstractIntlMessages>

export type NamespaceEntry = readonly [namespace: string, messages: AbstractIntlMessages]

const MESSAGES_QUERY_KEY = "i18n-messages"
const NAMESPACE_SEPARATOR = "."

const pageMetadataSchema = zod.object({ description: zod.string(), title: zod.string() })

type PageMetadata = zod.infer<typeof pageMetadataSchema>

export const toNamespace = (path: string): string => path.replaceAll(/^.*\/|\.json$/gu, "")

const rootMessagePaths = Object.keys(
  import.meta.glob([
    "../../../messages/*/common.json",
    "../../../messages/*/components.*.json",
    "../../../messages/*/dashboard.*.json",
    "../../../messages/*/errors*.json",
    "../../../messages/*/navigation.*.json",
  ]),
)

export const ROOT_NAMESPACES = [...new Set(rootMessagePaths.map((path) => toNamespace(path)))]

const modulePath = ({ locale, namespace }: { locale: SupportedLocale; namespace: string }): string =>
  `../../../messages/${locale}/${namespace}.json`

const missingNamespace = ({ locale, namespace }: { locale: SupportedLocale; namespace: string }): Error =>
  new Error(`No messages/${locale}/${namespace}.json — every declared namespace needs a file per supported locale.`)

export const loadPageMetadata = async ({
  locale,
  namespace,
  values = {},
}: {
  locale: SupportedLocale
  namespace: string
  values?: Readonly<Record<string, number | string>>
}): Promise<PageMetadata> => {
  const { metadata } = await loadNamespace({ locale, namespace })
  const parsed = pageMetadataSchema.safeParse(metadata)

  if (!parsed.success) {
    throw new Error(`messages/${locale}/${namespace}.json has no page metadata — a page namespace starts with its title and description.`)
  }

  const t = createTranslator({ locale, messages: parsed.data })
  const args = { appName: APP_NAME, ...values }

  return { description: t("description", args), title: t("title", args) }
}

export function loadNamespace<TMessages extends AbstractIntlMessages>(args: {
  locale: SupportedLocale
  namespace: string
}): Promise<TMessages>
export async function loadNamespace({ locale, namespace }: { locale: SupportedLocale; namespace: string }): Promise<AbstractIntlMessages> {
  const { MESSAGE_LOADERS } = await import("~/src/integrations/use-intl/i18n.loaders")
  const load = MESSAGE_LOADERS[modulePath({ locale, namespace })]

  if (load === undefined) {
    throw missingNamespace({ locale, namespace })
  }

  return load()
}

const isMessageTree = (value: AbstractIntlMessages | string | undefined): value is MessageTree => typeof value === "object"

const insertNamespace = ({ messages, namespace, tree }: { messages: AbstractIntlMessages; namespace: string; tree: MessageTree }): void => {
  const separator = namespace.lastIndexOf(NAMESPACE_SEPARATOR)
  const leaf = namespace.slice(separator + NAMESPACE_SEPARATOR.length)
  const parents = namespace.slice(0, Math.max(separator, 0)).split(NAMESPACE_SEPARATOR).filter(Boolean)

  let node = tree

  for (const segment of parents) {
    const existing = node[segment]
    const child = isMessageTree(existing) ? { ...existing } : {}

    node[segment] = child
    node = child
  }

  const existing = node[leaf]
  node[leaf] = isMessageTree(existing) ? { ...existing, ...messages } : messages
}

export const buildMessageTree = (entries: readonly NamespaceEntry[]): AbstractIntlMessages => {
  const tree: MessageTree = {}

  for (const [namespace, messages] of entries) {
    insertNamespace({ messages, namespace, tree })
  }

  return tree
}

export const messagesQueryOptions = ({ locale, namespace }: { locale: SupportedLocale; namespace: string }) =>
  queryOptions({
    gcTime: Infinity,
    meta: { public: true },
    queryFn: () => loadNamespace({ locale, namespace }),
    queryKey: [MESSAGES_QUERY_KEY, locale, namespace],
    select: (messages): NamespaceEntry => [namespace, messages],
    staleTime: Infinity,
  })

export const preloadNamespaces = async ({
  locale,
  namespaces,
  queryClient,
}: {
  locale: SupportedLocale
  namespaces: readonly string[]
  queryClient: QueryClient
}): Promise<void> => {
  await Promise.all(
    namespaces.map((namespace) => queryClient.query({ ...messagesQueryOptions({ locale, namespace }), staleTime: "static" })),
  )
}
