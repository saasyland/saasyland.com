import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"
import { adminAc } from "better-auth/plugins/admin/access"
import { useFormatter } from "use-intl/react"
import { commitEmojis } from "virtual:repository-facts"

import { APP_STATEMENTS } from "~/src/integrations/better-auth/auth.access"
import {
  BACKUP_CODE_MAX_LENGTH,
  BACKUP_CODE_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TWO_FACTOR_CODE_LENGTH,
} from "~/src/integrations/better-auth/auth.constraints"
import { RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { PPP_TIERS } from "~/src/modules/_core/constants/pricing"
import { LOCALIZED_TEXT_MAX_LENGTH } from "~/src/modules/_core/utils/localized-text"
import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { POSTER_SMALL_WIDTH, POSTER_WIDTH } from "~/src/modules/video/video.constants"
import {
  AUDIO_BITRATE,
  AUDIO_SAMPLE_RATE,
  KEYFRAME_SECONDS,
  LOWER_RENDITION_HEIGHTS,
  MAX_RENDITION_HEIGHT,
  SEGMENT_SECONDS,
  STORYBOARD_MAX_FRAMES,
  STORYBOARD_MIN_INTERVAL_SECONDS,
  VIDEO_QUALITY_CRF,
} from "~/src/modules/video/video.encoding"
import { PLAYBACK_TTL_SECONDS } from "~/src/modules/video/video.playback"

import { SAVE_INTERVAL_MS } from "~/src/hooks/use-lesson-progress"

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { LIVE_SITE_CHECKS } from "~/src/lib/deployment"
import { MILLISECONDS_PER_SECOND, MINUTES_PER_HOUR, SECONDS_PER_MINUTE } from "~/src/lib/duration"
import { SOCIAL_IMAGE } from "~/src/lib/seo"

import { ACTIVATION_TIMEOUT_MS } from "~/src/presentation/components/custom/app/checkout-activation"

import { UNLISTED_ROUTES } from "~/src/routes"

type Value = number | string | readonly string[]

const QUERY_GC_TIME_MINUTES = 5
const QUERY_STALE_TIME_MINUTES = 1
const RECIPIENT_EMAILS_PER_HOUR = 3

const renditionName = (height: number): string => `${String(height)}p`

const FACTS = {
  ...REPOSITORY_FACTS,
  activationTimeoutSeconds: ACTIVATION_TIMEOUT_MS / MILLISECONDS_PER_SECOND,
  adminPreviewPageSize: ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize,
  audioBitrate: AUDIO_BITRATE,
  audioSampleRate: AUDIO_SAMPLE_RATE,
  backupCodeMaxLength: BACKUP_CODE_MAX_LENGTH,
  backupCodeMinLength: BACKUP_CODE_MIN_LENGTH,
  defaultPageSize: DEFAULT_PAGE_SIZE,
  lessonProgressSaveSeconds: SAVE_INTERVAL_MS / MILLISECONDS_PER_SECOND,
  liveSiteCheckPaths: LIVE_SITE_CHECKS.map(({ path }) => path),
  localizedTextMaxLength: LOCALIZED_TEXT_MAX_LENGTH,
  passwordMaxLength: PASSWORD_MAX_LENGTH,
  passwordMinLength: PASSWORD_MIN_LENGTH,
  posterSmallWidth: POSTER_SMALL_WIDTH,
  posterWidth: POSTER_WIDTH,
  queryGcTimeMinutes: QUERY_GC_TIME_MINUTES,
  queryStaleTimeMinutes: QUERY_STALE_TIME_MINUTES,
  rateLimitWindowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  recipientEmailsPerHour: RECIPIENT_EMAILS_PER_HOUR,
  routerStaleTimeMinutes: QUERY_STALE_TIME_MINUTES,
  sensitiveRateLimit: RATE_LIMITS.SENSITIVE.max,
  signedMediaHours: PLAYBACK_TTL_SECONDS / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR),
  slugMaxLength: SLUG_MAX_LENGTH,
  socialImageHeight: SOCIAL_IMAGE.HEIGHT,
  socialImageWidth: SOCIAL_IMAGE.WIDTH,
  storyboardIntervalSeconds: STORYBOARD_MIN_INTERVAL_SECONDS,
  storyboardMaxTiles: STORYBOARD_MAX_FRAMES,
  supportedLocales: I18N.SUPPORTED_LOCALES,
  tokenRateLimit: RATE_LIMITS.TOKEN.max,
  twoFactorCodeLength: TWO_FACTOR_CODE_LENGTH,
  unlistedRoutes: UNLISTED_ROUTES,
  videoKeyframeSeconds: KEYFRAME_SECONDS,
  videoLowerRenditions: LOWER_RENDITION_HEIGHTS.map((height) => renditionName(height)),
  videoQualityCrf: VIDEO_QUALITY_CRF,
  videoSegmentSeconds: SEGMENT_SECONDS,
  videoTopRendition: renditionName(MAX_RENDITION_HEIGHT),
} satisfies Record<string, Value>

const TABLES = {
  adminStatements: Object.entries(adminAc.statements),
  appStatements: Object.entries(APP_STATEMENTS),
  commitTypes: Object.entries(commitEmojis),
  pppTiers: PPP_TIERS.map(({ countries, multiplier }) => [multiplier, countries] as const),
} satisfies Record<string, readonly (readonly [number | string, Value])[]>

const UNIT_FORMATS = {
  hour: { style: "unit", unit: "hour", unitDisplay: "long" },
  minute: { style: "unit", unit: "minute", unitDisplay: "long" },
  percent: { style: "unit", unit: "percent" },
  second: { style: "unit", unit: "second", unitDisplay: "long" },
} as const satisfies Record<string, Intl.NumberFormatOptions>

const FactValue = ({ unit, value }: { readonly unit?: keyof typeof UNIT_FORMATS | undefined; readonly value: Value }): JSX.Element => {
  const format = useFormatter()

  if (typeof value === "number") {
    return <>{format.number(value, unit === undefined ? undefined : UNIT_FORMATS[unit])}</>
  }

  if (typeof value === "string") {
    return <code>{value}</code>
  }

  return <>{format.list(value.map((item) => <code key={item}>{item}</code>))}</>
}

export const RepositoryFact = ({
  name,
  unit,
}: {
  readonly name: keyof typeof FACTS
  readonly unit?: keyof typeof UNIT_FORMATS
}): JSX.Element => <FactValue unit={unit} value={FACTS[name]} />

export const RepositoryTable = ({
  columns: [keyColumn, valueColumn],
  name,
}: {
  readonly columns: readonly [string, string]
  readonly name: keyof typeof TABLES
}): JSX.Element => (
  <defaultMdxComponents.table>
    <thead>
      <tr>
        <th>{keyColumn}</th>
        <th>{valueColumn}</th>
      </tr>
    </thead>
    <tbody>
      {TABLES[name].map(([key, value]) => (
        <tr key={key}>
          <td>
            <FactValue value={key} />
          </td>
          <td>
            <FactValue value={value} />
          </td>
        </tr>
      ))}
    </tbody>
  </defaultMdxComponents.table>
)
