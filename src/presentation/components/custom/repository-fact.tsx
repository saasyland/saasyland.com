import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"
import { adminAc } from "better-auth/plugins/admin/access"
import { useFormatter } from "use-intl/react"
import { cliApiTables, commitEmojis, seededAccounts } from "virtual:repository-facts"

import {
  BACKUP_CODE_MAX_LENGTH,
  BACKUP_CODE_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TWO_FACTOR_CODE_LENGTH,
} from "~/src/integrations/better-auth/auth.constraints"
import { RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS } from "~/src/integrations/better-auth/auth.middleware"
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { PPP_TIERS } from "~/src/modules/_core/constants/pricing"
import { LOCALIZED_TEXT_MAX_LENGTH } from "~/src/modules/_core/utils/localized-text"
import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import {
  BUNDLE_ARCHIVE_EXTENSION,
  BUNDLE_BINDING,
  BUNDLE_CONTENT_TYPE,
  BUNDLE_PATH_PREFIX,
  LICENSE_API_RETRY_AFTER_SECONDS,
  REGIONAL_DISCOUNTS_REFRESH_AFTER_MS,
} from "~/src/modules/license/license.constants"
import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { POSTER_SMALL_WIDTH, POSTER_WIDTH, VIDEO_LIBRARY_PAGE_SIZE } from "~/src/modules/video/video.constants"
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

import { APP_STATEMENTS } from "~/src/data/access"
import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"
import { CLI_EXEC, CLI_LICENSE_COMMANDS, CLI_LICENSE_KEY_VARIABLE, SCAFFOLD_TARGET, cliCommand } from "~/src/data/cli"
import { LIVE_SITE_CHECKS } from "~/src/data/live"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"
import { UNLISTED_ROUTES } from "~/src/data/unlisted"

import { LIVE_SITE_CHECK_RETRY_DELAYS_MS, LIVE_SITE_CHECK_RETRY_DELAY_MS } from "~/src/lib/deployment"
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "~/src/lib/duration"
import { STAR_COUNT_FETCH_TIMEOUT_MS, STAR_COUNT_REFRESH_AFTER_MS } from "~/src/lib/github"
import { SOCIAL_IMAGE } from "~/src/lib/seo"

import { ACTIVATION_POLL_MS, ACTIVATION_TIMEOUT_MS } from "~/src/presentation/components/custom/app/checkout-activation"

type Value = number | string | readonly string[]

const renditionName = (height: number): string => `${String(height)}p`

const FACTS = {
  ...REPOSITORY_FACTS,
  activationPollSeconds: ACTIVATION_POLL_MS / MILLISECONDS_PER_SECOND,
  activationTimeoutSeconds: ACTIVATION_TIMEOUT_MS / MILLISECONDS_PER_SECOND,
  adminPreviewPageSize: ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize,
  audioBitrate: AUDIO_BITRATE,
  audioSampleRate: AUDIO_SAMPLE_RATE,
  backupCodeMaxLength: BACKUP_CODE_MAX_LENGTH,
  backupCodeMinLength: BACKUP_CODE_MIN_LENGTH,
  cliApiRetryAfterSeconds: LICENSE_API_RETRY_AFTER_SECONDS,
  cliBundleBinding: BUNDLE_BINDING,
  cliBundleContentType: BUNDLE_CONTENT_TYPE,
  cliBundleKey: `<version>${BUNDLE_ARCHIVE_EXTENSION}`,
  cliBundleUrlPath: `${BUNDLE_PATH_PREFIX}/<expiry>.<signature>/<version>${BUNDLE_ARCHIVE_EXTENSION}`,
  cliExec: CLI_EXEC,
  cliLicenseCommands: CLI_LICENSE_COMMANDS.map((command) => cliCommand(command)),
  cliLicenseKeyVariable: CLI_LICENSE_KEY_VARIABLE,
  courseShowcaseCourses: COURSE_SHOWCASE.COURSES,
  courseShowcaseLessons: COURSE_SHOWCASE.LESSONS,
  defaultPageSize: DEFAULT_PAGE_SIZE,
  lessonProgressSaveSeconds: SAVE_INTERVAL_MS / MILLISECONDS_PER_SECOND,
  liveSiteCheckPaths: LIVE_SITE_CHECKS.map(({ path }) => path),
  liveSiteCheckRetries: LIVE_SITE_CHECK_RETRY_DELAYS_MS.length,
  liveSiteCheckRetrySeconds: LIVE_SITE_CHECK_RETRY_DELAY_MS / MILLISECONDS_PER_SECOND,
  localizedTextMaxLength: LOCALIZED_TEXT_MAX_LENGTH,
  passwordMaxLength: PASSWORD_MAX_LENGTH,
  passwordMinLength: PASSWORD_MIN_LENGTH,
  posterSmallWidth: POSTER_SMALL_WIDTH,
  posterWidth: POSTER_WIDTH,
  queryGcTimeMinutes: QUERY_GC_TIME_MS / MILLISECONDS_PER_MINUTE,
  queryStaleTimeMinutes: QUERY_STALE_TIME_MS / MILLISECONDS_PER_MINUTE,
  rateLimitWindowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  recipientEmailsPerHour: RECIPIENT_EMAILS_PER_HOUR,
  regionalDiscountsRefreshMinutes: REGIONAL_DISCOUNTS_REFRESH_AFTER_MS / MILLISECONDS_PER_MINUTE,
  routerStaleTimeMinutes: QUERY_STALE_TIME_MS / MILLISECONDS_PER_MINUTE,
  scaffoldTarget: SCAFFOLD_TARGET,
  sensitiveRateLimit: RATE_LIMITS.SENSITIVE.max,
  signedMediaHours: PLAYBACK_TTL_SECONDS / SECONDS_PER_HOUR,
  slugMaxLength: SLUG_MAX_LENGTH,
  socialImageHeight: SOCIAL_IMAGE.HEIGHT,
  socialImageWidth: SOCIAL_IMAGE.WIDTH,
  starCountFetchTimeoutSeconds: STAR_COUNT_FETCH_TIMEOUT_MS / MILLISECONDS_PER_SECOND,
  starCountRefreshHours: STAR_COUNT_REFRESH_AFTER_MS / MILLISECONDS_PER_HOUR,
  storyboardIntervalSeconds: STORYBOARD_MIN_INTERVAL_SECONDS,
  storyboardMaxTiles: STORYBOARD_MAX_FRAMES,
  supportedLocales: I18N.SUPPORTED_LOCALES,
  tokenRateLimit: RATE_LIMITS.TOKEN.max,
  twoFactorCodeLength: TWO_FACTOR_CODE_LENGTH,
  unlistedRoutes: UNLISTED_ROUTES,
  videoKeyframeSeconds: KEYFRAME_SECONDS,
  videoLibraryPageSize: VIDEO_LIBRARY_PAGE_SIZE,
  videoLowerRenditions: LOWER_RENDITION_HEIGHTS.map((height) => renditionName(height)),
  videoQualityCrf: VIDEO_QUALITY_CRF,
  videoSegmentSeconds: SEGMENT_SECONDS,
  videoTopRendition: renditionName(MAX_RENDITION_HEIGHT),
} satisfies Record<string, Value>

const TABLES = {
  adminStatements: Object.entries(adminAc.statements),
  appStatements: Object.entries(APP_STATEMENTS),
  cliApiEndpoints: cliApiTables.endpoints,
  cliApiErrors: cliApiTables.errors,
  cliBundleBuckets: cliApiTables.bundleBuckets,
  commitTypes: Object.entries(commitEmojis),
  pppTiers: PPP_TIERS.map(({ countries, multiplier }) => [multiplier, countries] as const),
  seededAccounts,
} satisfies Record<string, readonly (readonly [number | string, ...Value[]])[]>

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
  columns,
  name,
}: {
  readonly columns: readonly string[]
  readonly name: keyof typeof TABLES
}): JSX.Element => (
  <defaultMdxComponents.table>
    <thead>
      <tr>
        {columns.map((column) => (
          <th key={column}>{column}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {TABLES[name].map((row) => (
        <tr key={row[0]}>
          {row.map((value, index) => (
            <td key={columns[index]}>
              <FactValue value={value} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </defaultMdxComponents.table>
)
