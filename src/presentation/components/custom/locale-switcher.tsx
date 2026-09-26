import type { ComponentProps, JSX } from "react"

import { useRouterState } from "@tanstack/react-router"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { deLocalizePathname, isSupportedLocale, localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getLocaleName } from "~/src/modules/_core/constants/locale"

import { cn } from "~/src/lib/cn"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/src/presentation/components/shadcn/select"

const SUMMARY_CLASS =
  "inline-flex min-h-6 cursor-pointer list-none items-center gap-1.5 text-[0.9375rem] whitespace-nowrap text-muted-foreground transition-colors duration-300 outline-none select-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring group-open:text-foreground [&::-webkit-details-marker]:hidden"

const MENU_CLASS = "absolute end-0 bottom-full z-50 mb-3 min-w-40 border border-border bg-background p-1 shadow-lg"

const ITEM_CLASS =
  "flex items-center justify-between gap-4 px-2 py-1.5 text-[0.9375rem] whitespace-nowrap text-muted-foreground transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground aria-[current]:text-foreground"

const LocaleSwitcher = ({ className, ...props }: ComponentProps<"details">): JSX.Element => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const currentLocale = getCurrentLocale()
  const t = useTranslations("components.custom.locale-switcher")

  const basePath = deLocalizePathname(pathname)

  return (
    <details
      className={cn("group relative", className)}
      {...props}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          event.currentTarget.open = false
        }
      }}
    >
      <summary
        aria-label={t("label")}
        className={SUMMARY_CLASS}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.parentElement?.removeAttribute("open")
          }
        }}
      >
        {getLocaleName(currentLocale)}
        <ChevronDownIcon aria-hidden className="size-3.5 opacity-70 transition-transform duration-300 group-open:rotate-180" />
      </summary>

      <ul className={MENU_CLASS}>
        {I18N.SUPPORTED_LOCALES.map((locale) => (
          <li key={locale}>
            <a
              className={ITEM_CLASS}
              {...(locale === currentLocale && { "aria-current": "true" })}
              href={localizePathname({ locale, pathname: basePath })}
              hrefLang={locale}
              lang={locale}
            >
              {getLocaleName(locale)}
              {locale === currentLocale && <CheckIcon aria-hidden className="size-4 shrink-0" />}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

const LocaleSelect = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const currentLocale = getCurrentLocale()
  const t = useTranslations("components.custom.locale-switcher")

  return (
    <Select
      className="w-full"
      fieldLabel={t("label")}
      fieldLabelClassName="sr-only"
      onChange={(value) => {
        if (typeof value === "string" && isSupportedLocale(value)) {
          globalThis.location.assign(localizePathname({ locale: value, pathname }))
        }
      }}
      value={currentLocale}
    >
      <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
        <SelectValue>
          {({ selectedText }) => {
            if (selectedText.length > 0) {
              return selectedText
            }

            return getLocaleName(currentLocale)
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{t("label")}</SelectLabel>
          {I18N.SUPPORTED_LOCALES.map((locale) => (
            <SelectItem id={locale} key={locale} lang={locale}>
              {getLocaleName(locale)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export { LocaleSelect, LocaleSwitcher }
