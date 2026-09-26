import { type QueryClient, queryOptions } from "@tanstack/react-query"
import type { AbstractIntlMessages } from "use-intl"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

type MessageTree = Record<string, AbstractIntlMessages>

export type NamespaceEntry = readonly [namespace: string, messages: AbstractIntlMessages]

interface PageMetadata {
  description: string
  title: string
}

const MESSAGES_QUERY_KEY = "i18n-messages"
const NAMESPACE_SEPARATOR = "."

const messageModules = import.meta.glob<AbstractIntlMessages>("../../../messages/*/*.json", { import: "default" })
const metadataModules = import.meta.glob<PageMetadata>("../../../messages/*/*.json", { import: "metadata" })

export const toNamespace = (path: string): string => path.replaceAll(/^.*\/|\.json$/gu, "")

const rootMessagePaths = Object.keys(
  import.meta.glob(["../../../messages/*/common.json", "../../../messages/*/components.*.json", "../../../messages/*/errors*.json"]),
)

export const ROOT_NAMESPACES = [...new Set(rootMessagePaths.map((path) => toNamespace(path)))]

const modulePath = ({ locale, namespace }: { locale: SupportedLocale; namespace: string }): string =>
  `../../../messages/${locale}/${namespace}.json`

const missingNamespace = ({ locale, namespace }: { locale: SupportedLocale; namespace: string }): Error =>
  new Error(`No messages/${locale}/${namespace}.json — every declared namespace needs a file per supported locale.`)

export const loadPageMetadata = ({ locale, namespace }: { locale: SupportedLocale; namespace: string }): Promise<PageMetadata> => {
  const load = metadataModules[modulePath({ locale, namespace })]

  if (load === undefined) {
    throw missingNamespace({ locale, namespace })
  }

  return load()
}

export function loadNamespace<TMessages extends AbstractIntlMessages>(args: {
  locale: SupportedLocale
  namespace: string
}): Promise<TMessages>
export function loadNamespace({ locale, namespace }: { locale: SupportedLocale; namespace: string }): Promise<AbstractIntlMessages> {
  const load = messageModules[modulePath({ locale, namespace })]

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
