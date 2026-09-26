import { type JSX, useEffect, useState } from "react"

import { useRouter } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ADMIN_SIDEBAR_GROUPS } from "~/src/data/admin"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/src/presentation/components/shadcn/command"
import { Kbd, KbdGroup } from "~/src/presentation/components/shadcn/kbd"

export const AdminCommandPalette = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const router = useRouter()
  const t = useTranslations("pages.admin")

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return (
    <>
      <button
        className="group flex h-8 items-center gap-2 rounded-lg border border-border bg-muted/40 pr-1.5 pl-2.5 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => {
          setIsOpen(true)
        }}
        type="button"
      >
        <Search aria-hidden className="size-3.5" strokeWidth={1.75} />
        <span className="hidden sm:inline">{t("components.header.searchPlaceholder")}</span>
        <KbdGroup className="ml-6 hidden sm:inline-flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </button>

      <CommandDialog isOpen={isOpen} onOpenChange={setIsOpen}>
        <Command>
          <CommandInput placeholder={t("components.header.searchPlaceholder")} />
          <CommandList
            className="max-h-80"
            renderEmptyState={() => <CommandEmpty className="text-muted-foreground">{t("components.header.searchEmpty")}</CommandEmpty>}
          >
            {ADMIN_SIDEBAR_GROUPS.map((group) => (
              <CommandGroup heading={t(`sidebar.groups.${group.titleKey}`)} id={group.titleKey} key={group.titleKey}>
                {group.items.map((item) => (
                  <CommandItem
                    className="gap-2.5"
                    id={item.url}
                    key={item.titleKey}
                    onAction={() => {
                      setIsOpen(false)
                      void router.navigate({ to: item.url })
                    }}
                    textValue={t(`sidebar.links.${item.titleKey}`)}
                  >
                    <item.icon aria-hidden className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    {t(`sidebar.links.${item.titleKey}`)}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
