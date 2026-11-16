import type { AbstractIntlMessages } from "use-intl"

export const MESSAGE_LOADERS = import.meta.glob<AbstractIntlMessages>("../../../messages/*/*.json", { import: "default" })
