import type { JSX, ReactNode } from "react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

interface LocaleTabsProps {
  readonly children: (locale: SupportedLocale) => ReactNode
  readonly label: string
}

export const LocaleTabs = ({ children, label }: LocaleTabsProps): JSX.Element => (
  <Tabs defaultSelectedKey={I18N.DEFAULT_LOCALE}>
    <TabsList aria-label={label} className="no-scrollbar h-auto w-full justify-start overflow-x-auto" variant="line">
      {I18N.SUPPORTED_LOCALES.map((locale) => (
        <TabsTrigger className="flex-none font-mono text-xs" id={locale} key={locale}>
          {locale}
        </TabsTrigger>
      ))}
    </TabsList>
    {I18N.SUPPORTED_LOCALES.map((locale) => (
      <TabsContent className="pt-3" id={locale} key={locale}>
        {children(locale)}
      </TabsContent>
    ))}
  </Tabs>
)
