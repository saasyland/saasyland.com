import { useQuery } from "@tanstack/react-query"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { TimeZoneSource } from "~/src/data/time-zone"

export const AUTH_TIME_ZONES = [
  { useTimeZone: () => useQuery({ ...getCurrentSessionQuery, enabled: false }).data?.user.timezone ?? I18N.DEFAULT_TIMEZONE },
] as const satisfies readonly TimeZoneSource[]
