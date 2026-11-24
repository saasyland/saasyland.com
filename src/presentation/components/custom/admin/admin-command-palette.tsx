import { type JSX, useEffect, useState } from "react"

import { useQueries, useQuery } from "@tanstack/react-query"
import { useHydrated, useRouter } from "@tanstack/react-router"
import { CornerDownLeft, History, LoaderCircle, type LucideIcon, Search } from "lucide-react"
import { Autocomplete, Button, Input, SearchField, useFilter } from "react-aria-components"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { hasPermission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { SEARCH_TEXT_MIN_LENGTH } from "~/src/modules/_core/utils/search"

import { COMMAND_SEARCHES } from "~/src/data/command-search"
import { ADMIN_COMMAND_ACTIONS, ADMIN_NAVIGATION } from "~/src/data/navigation"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "~/src/presentation/components/shadcn/command"
import { Kbd, KbdGroup } from "~/src/presentation/components/shadcn/kbd"

const SEARCH_DEBOUNCE_MS = 200
const RECENT_LIMIT = 5
const RECENT_STORAGE_KEY = "admin-command-palette-recent"
const APPLE_PLATFORM = /Mac|iPhone|iPad/u

interface PaletteItem {
  readonly detail: string
  readonly group: string
  readonly icon: LucideIcon
  readonly title: string
  readonly to: string
}

interface PaletteGroup {
  readonly heading: string
  readonly id: string
  readonly items: readonly PaletteItem[]
}

const recentSchema = zod
  .array(zod.object({ detail: zod.string(), group: zod.string(), title: zod.string(), to: zod.string() }))
  .max(RECENT_LIMIT)

const PAGE_ITEMS = ADMIN_NAVIGATION.flatMap((group) => group.items.map((item) => ({ group: group.key, item })))

const iconOf = ({ group, to }: { readonly group: string; readonly to: string }): LucideIcon =>
  [...PAGE_ITEMS.map(({ item }) => item), ...ADMIN_COMMAND_ACTIONS].find((item) => item.to === to)?.icon ??
  COMMAND_SEARCHES.find((search) => `${search.area}.${search.key}` === group)?.icon ??
  History

const readRecent = (): readonly PaletteItem[] => {
  try {
    const stored = recentSchema.safeParse(JSON.parse(globalThis.localStorage.getItem(RECENT_STORAGE_KEY) ?? "[]"))
    return (stored.data ?? []).map((item) => ({
      detail: item.detail,
      group: item.group,
      icon: iconOf(item),
      title: item.title,
      to: item.to,
    }))
  } catch {
    return []
  }
}

const rememberRecent = ({ detail, group, title, to }: PaletteItem): boolean => {
  const kept = readRecent()
    .filter((item) => item.to !== to)
    .map((item) => ({ detail: item.detail, group: item.group, title: item.title, to: item.to }))
  try {
    globalThis.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([{ detail, group, title, to }, ...kept].slice(0, RECENT_LIMIT)))
    return true
  } catch {
    return false
  }
}

interface PaletteSession {
  readonly id: number
  readonly isOpen: boolean
}

const opened = (session: PaletteSession): PaletteSession => ({ id: session.id + 1, isOpen: true })

const closed = (session: PaletteSession): PaletteSession => ({ id: session.id, isOpen: false })

const toggled = (session: PaletteSession): PaletteSession => (session.isOpen ? closed(session) : opened(session))

const useDebounced = (value: string): string => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [value])

  return debounced
}

const useRecordGroups = (query: string): { readonly groups: readonly PaletteGroup[]; readonly isSearching: boolean } => {
  const t = useTranslations("navigation")
  const text = useDebounced(query.trim())

  const role = useQuery(getCurrentSessionQuery).data?.user.role
  const searches = COMMAND_SEARCHES.filter((search) => hasPermission({ permission: search.permission, role }))
  const results = useQueries({ queries: searches.map((search) => search.query({ locale: getCurrentLocale(), text })) })
  const isEnabled = text.length >= SEARCH_TEXT_MIN_LENGTH

  const groups = results.flatMap((result, index) =>
    searches.slice(index, index + 1).map((search) => ({
      heading: t(`${search.area}.search.${search.key}`),
      id: `${search.area}.${search.key}`,
      items: (result.data ?? []).map((hit) => ({
        detail: hit.detail,
        group: `${search.area}.${search.key}`,
        icon: search.icon,
        title: hit.title,
        to: hit.to,
      })),
    })),
  )

  return {
    groups: groups.filter((group) => isEnabled && group.items.length > 0),
    isSearching: query.trim().length >= SEARCH_TEXT_MIN_LENGTH && (text !== query.trim() || results.some((result) => result.isFetching)),
  }
}

const usePaletteGroups = (query: string, recent: readonly PaletteItem[]) => {
  const t = useTranslations()

  const { contains } = useFilter({ sensitivity: "base" })
  const { groups: records, isSearching } = useRecordGroups(query)

  const matches = (item: PaletteItem): boolean => contains(`${item.title} ${item.detail}`, query.trim())
  const pages = PAGE_ITEMS.map(({ group, item }) => ({
    detail: t(`pages.admin.sidebar.groups.${group}`),
    group: "pages",
    icon: item.icon,
    title: t(item.label),
    to: item.to,
  }))
  const actions = ADMIN_COMMAND_ACTIONS.map((action) => ({
    detail: "",
    group: "actions",
    icon: action.icon,
    title: t(action.label),
    to: action.to,
  }))
  const groups = [
    { heading: t("pages.admin.components.commandPalette.groups.recent"), id: "recent", items: query.trim().length === 0 ? recent : [] },
    { heading: t("pages.admin.components.commandPalette.groups.actions"), id: "actions", items: actions.filter((item) => matches(item)) },
    { heading: t("pages.admin.components.commandPalette.groups.pages"), id: "pages", items: pages.filter((item) => matches(item)) },
    ...records,
  ]

  return { groups: groups.filter((group) => group.items.length > 0), isSearching }
}

const PaletteRow = ({ item }: { readonly item: PaletteItem }): JSX.Element => (
  <>
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground transition-colors duration-150 ease-exp group-data-focused/command-item:border-foreground/15 group-data-focused/command-item:text-foreground"
    >
      <item.icon className="size-4" strokeWidth={1.75} />
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-body-sm font-medium text-foreground">{item.title}</span>
      {item.detail.length > 0 && <span className="truncate text-spec text-muted-foreground">{item.detail}</span>}
    </span>
    <CommandShortcut aria-hidden className="opacity-0 transition-opacity duration-150 ease-exp group-data-focused/command-item:opacity-100">
      <CornerDownLeft className="size-3.5" strokeWidth={1.75} />
    </CommandShortcut>
  </>
)

const PaletteFooter = (): JSX.Element => {
  const t = useTranslations("pages.admin.components.commandPalette.keys")

  return (
    <div
      aria-hidden
      className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-spec text-muted-foreground max-sm:hidden"
    >
      <span className="flex items-center gap-1.5">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </KbdGroup>
        {t("navigate")}
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>↵</Kbd>
        {t("open")}
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>esc</Kbd>
        {t("close")}
      </span>
    </div>
  )
}

const PaletteStatus = ({
  count,
  isSearching,
  query,
}: {
  readonly count: number
  readonly isSearching: boolean
  readonly query: string
}) => {
  const t = useTranslations("pages.admin.components.commandPalette")

  return (
    <p aria-live="polite" className="sr-only">
      {isSearching && t("searching")}
      {!isSearching && query.trim().length > 0 && t("results", { count })}
    </p>
  )
}

const PaletteContent = ({ onClose }: { readonly onClose: () => void }): JSX.Element => {
  const t = useTranslations("pages.admin.components.commandPalette")
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [recent] = useState(readRecent)

  const { groups, isSearching } = usePaletteGroups(query, recent)

  const preload = (item: PaletteItem): void => {
    void router.preloadRoute({ to: item.to })
  }

  const open = (item: PaletteItem): void => {
    rememberRecent(item)
    onClose()
    void router.navigate({ href: item.to })
  }

  return (
    <div className="flex max-h-[min(36rem,calc(100dvh-8rem))] min-h-0 flex-col" data-slot="command">
      <Autocomplete onInputChange={setQuery}>
        <SearchField aria-label={t("placeholder")} autoFocus className="flex items-center gap-3 border-b border-border px-4">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <Input
            className="h-13 w-full min-w-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            placeholder={t("placeholder")}
          />
          {isSearching && <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground" strokeWidth={1.75} />}
        </SearchField>
        <CommandList
          aria-label={t("title")}
          className="custom-scrollbar max-h-none min-h-0 flex-1 scroll-py-2 overflow-y-auto overscroll-contain p-2"
          renderEmptyState={() => (
            <CommandEmpty className="flex flex-col gap-1 px-6 py-10">
              {isSearching && <span className="text-body-sm text-muted-foreground">{t("searching")}</span>}
              {!isSearching && (
                <>
                  <span className="text-body-sm text-foreground">{t("empty", { query: query.trim() })}</span>
                  <span className="text-spec text-muted-foreground">{t("emptyHint")}</span>
                </>
              )}
            </CommandEmpty>
          )}
        >
          {groups.map((group) => (
            <CommandGroup className="p-0 pb-2 last:pb-0" heading={group.heading} id={group.id} key={group.id}>
              {group.items.map((item) => (
                <CommandItem
                  className="gap-3 rounded-md px-2 py-1.5"
                  id={`${group.id}:${item.to}`}
                  key={`${group.id}:${item.to}`}
                  onAction={() => {
                    open(item)
                  }}
                  onHoverStart={() => {
                    preload(item)
                  }}
                  textValue={item.title}
                >
                  <PaletteRow item={item} />
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Autocomplete>
      <PaletteStatus count={groups.reduce((total, group) => total + group.items.length, 0)} isSearching={isSearching} query={query} />
      <PaletteFooter />
    </div>
  )
}

export const AdminCommandPalette = (): JSX.Element => {
  const t = useTranslations("pages.admin.components.commandPalette")
  const hydrated = useHydrated()
  const [session, setSession] = useState<PaletteSession>({ id: 0, isOpen: false })

  const modifier = hydrated && !APPLE_PLATFORM.test(globalThis.navigator.userAgent) ? "Ctrl" : "⌘"

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSession(toggled)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <>
      <Button
        aria-keyshortcuts="Meta+K Control+K"
        className="group flex h-8 items-center gap-2 rounded-md border border-border bg-background pr-1.5 pl-2.5 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp outline-none hover:border-foreground/20 hover:text-foreground data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid lg:w-64"
        onPress={() => {
          setSession(opened)
        }}
      >
        <Search aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
        <span className="sr-only lg:not-sr-only lg:flex-1 lg:text-left">{t("title")}</span>
        <KbdGroup aria-hidden className="hidden lg:inline-flex">
          <Kbd>{modifier}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        className="top-[12vh] gap-0 border-0 shadow-lg sm:max-w-xl"
        description={t("description")}
        isOpen={session.isOpen}
        onOpenChange={() => {
          setSession(closed)
        }}
        title={t("title")}
      >
        <PaletteContent
          key={session.id}
          onClose={() => {
            setSession(closed)
          }}
        />
      </CommandDialog>
    </>
  )
}
