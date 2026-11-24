import { useQuery } from "@tanstack/react-query"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

export const useSessionTimeZone = (): string =>
  useQuery({ ...getCurrentSessionQuery, enabled: false }).data?.user.timezone ?? I18N.DEFAULT_TIMEZONE
