import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"
import { CI_PROVIDER, CI_PROVIDERS, CI_REPOSITORY_VARIABLE, PLATFORM } from "@saasyland/stack/api"
import { adminAc } from "better-auth/plugins/admin/access"
import { useFormatter } from "use-intl/react"
import { cliApiTables, commitEmojis, seededAccounts } from "virtual:repository-facts"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
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

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import { LOCALIZED_TEXT_MAX_LENGTH } from "~/src/modules/_core/utils/localized-text"
import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import { COURSE_SHOWCASE } from "~/src/modules/course/course.constants"
import {
  BUNDLE_ARCHIVE_EXTENSION,
  BUNDLE_BINDING,
  BUNDLE_CONTENT_TYPE,
  BUNDLE_METADATA,
  BUNDLE_PATH_PREFIX,
  LICENSE_API_RETRY_AFTER_SECONDS,
  LICENSE_CHECKOUT_FIELD,
  REGIONAL_DISCOUNTS_REFRESH_AFTER_MS,
} from "~/src/modules/license/license.constants"
import { PPP_TIERS } from "~/src/modules/license/license.pricing"
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
import { AFFILIATE_PORTAL_URL, AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { OAUTH_CLIENTS, OAUTH_PROVIDERS, SOCIAL_SIGN_IN_PATH, oauthCallbackPath } from "~/src/data/auth"
import {
  CLI_API_URL_VARIABLE,
  CLI_COMMAND,
  CLI_CREDENTIALS_DIRECTORY,
  CLI_CREDENTIALS_FILE,
  CLI_CREDENTIALS_FILE_MODE,
  CLI_EXEC,
  CLI_EXIT_CODE,
  CLI_INIT_COMMAND,
  CLI_LICENSE_COMMANDS,
  CLI_LICENSE_KEY_VARIABLE,
  CLI_LOCALE_VARIABLE,
  CLI_PACKAGE_SPEC,
  CLI_RELEASE_CHANNEL,
  PACKAGE_MANAGERS,
  SCAFFOLD_TARGET,
  cliCommand,
} from "~/src/data/cli"
import { HEAD_START_CLAIM_MAX_HOURS } from "~/src/data/head-start"
import { LIVE_SITE_CHECKS } from "~/src/data/live"
import { ANGULARPROJECTS_ACCESS, CORE_PRICE_IN_HOURS, ILLUSTRATIVE_HOURLY_RATE, REACTPROJECTS_ACCESS } from "~/src/data/marketing"
import { NAVIGATION_PENDING_MIN_MS, NAVIGATION_PENDING_MS } from "~/src/data/navigation.constants"
import { REFUND_TERMS } from "~/src/data/refunds"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"
import { UNLISTED_ROUTES } from "~/src/data/unlisted"

import { SECRET_PLACEHOLDER_BRACKETS, SECRET_PLACEHOLDER_WORDS } from "~/src/lib/deploy-secrets"
import { LIVE_SITE_CHECK_RETRY_DELAYS_MS, LIVE_SITE_CHECK_RETRY_DELAY_MS } from "~/src/lib/deployment"
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "~/src/lib/duration"
import { FORMS_OF_ADDRESS } from "~/src/lib/forms-of-address"
import { STAR_COUNT_FETCH_TIMEOUT_MS, STAR_COUNT_REFRESH_AFTER_MS } from "~/src/lib/github"
import { SOCIAL_IMAGE } from "~/src/lib/seo"

import { ACTIVATION_POLL_MS, ACTIVATION_TIMEOUT_MS } from "~/src/presentation/components/custom/app/checkout-activation"

type Value = number | string | readonly string[]

const OCTAL_RADIX = 8
const FILE_MODE_DIGITS = 4

const renditionName = (height: number): string => `${String(height)}p`

const FACTS = {
  ...REPOSITORY_FACTS,
  activationPollSeconds: ACTIVATION_POLL_MS / MILLISECONDS_PER_SECOND,
  activationTimeoutSeconds: ACTIVATION_TIMEOUT_MS / MILLISECONDS_PER_SECOND,
  adminPreviewPageSize: ADMIN_DASHBOARD_PREVIEW_PAGINATION.pageSize,
  affiliateCommissionPercent: AFFILIATE_TERMS.COMMISSION_PERCENT,
  affiliateCookieDays: AFFILIATE_TERMS.COOKIE_DAYS,
  affiliateHoldDays: AFFILIATE_TERMS.HOLD_DAYS,
  affiliateMinimumPayout: AFFILIATE_TERMS.MINIMUM_PAYOUT,
  affiliatePayoutCurrency: AFFILIATE_TERMS.PAYOUT_CURRENCY,
  affiliatePortalUrl: AFFILIATE_PORTAL_URL,
  affiliateProgram: AFFILIATE_PROGRAM,
  affonsoReferralParams: AFFONSO.REFERRAL_PARAMS,
  angularprojectsAccess: ANGULARPROJECTS_ACCESS,
  audioBitrate: AUDIO_BITRATE,
  audioSampleRate: AUDIO_SAMPLE_RATE,
  backupCodeMaxLength: BACKUP_CODE_MAX_LENGTH,
  backupCodeMinLength: BACKUP_CODE_MIN_LENGTH,
  cliActivate: cliCommand(CLI_COMMAND.ACTIVATE),
  cliApiRetryAfterSeconds: LICENSE_API_RETRY_AFTER_SECONDS,
  cliApiUrlVariable: CLI_API_URL_VARIABLE,
  cliBundleBinding: BUNDLE_BINDING,
  cliBundleContentType: BUNDLE_CONTENT_TYPE,
  cliBundleDigestMetadata: BUNDLE_METADATA.SHA256,
  cliBundleKey: `<version>${BUNDLE_ARCHIVE_EXTENSION}`,
  cliBundleUrlPath: `${BUNDLE_PATH_PREFIX}/<expiry>.<signature>/<version>${BUNDLE_ARCHIVE_EXTENSION}`,
  cliCiProviders: CI_PROVIDERS.filter(({ id }) => id !== CI_PROVIDER.CUSTOM).map(({ id }) => id),
  cliCiRepositoryVariable: CI_REPOSITORY_VARIABLE,
  cliCredentialsFile: CLI_CREDENTIALS_FILE,
  cliCredentialsFileMode: CLI_CREDENTIALS_FILE_MODE.toString(OCTAL_RADIX).padStart(FILE_MODE_DIGITS, "0"),
  cliCredentialsLinuxFallback: CLI_CREDENTIALS_DIRECTORY.LINUX_FALLBACK,
  cliDeactivate: cliCommand(CLI_COMMAND.DEACTIVATE),
  cliExec: CLI_EXEC,
  cliExitCancelled: CLI_EXIT_CODE.CANCELLED,
  cliExitFailure: CLI_EXIT_CODE.FAILURE,
  cliExitNoPermission: CLI_EXIT_CODE.NO_PERMISSION,
  cliExitNotAvailable: CLI_EXIT_CODE.NOT_AVAILABLE,
  cliExitProtocol: CLI_EXIT_CODE.PROTOCOL,
  cliExitSuccess: CLI_EXIT_CODE.SUCCESS,
  cliExitTemporaryFailure: CLI_EXIT_CODE.TEMPORARY_FAILURE,
  cliExitUsage: CLI_EXIT_CODE.USAGE,
  cliInit: cliCommand(CLI_COMMAND.INIT),
  cliInitCommand: CLI_INIT_COMMAND,
  cliLicenseCommands: CLI_LICENSE_COMMANDS.map((command) => cliCommand(command)),
  cliLicenseKeyVariable: CLI_LICENSE_KEY_VARIABLE,
  cliLocaleVariable: CLI_LOCALE_VARIABLE,
  cliPackageSpec: CLI_PACKAGE_SPEC,
  cliReleaseChannel: CLI_RELEASE_CHANNEL,
  cliWhoami: cliCommand(CLI_COMMAND.WHOAMI),
  corePriceInHours: CORE_PRICE_IN_HOURS,
  courseShowcaseCourses: COURSE_SHOWCASE.COURSES,
  defaultPageSize: DEFAULT_PAGE_SIZE,
  googleCallbackUrl: `https://<host>${oauthCallbackPath(AUTH_PROVIDER.GOOGLE)}`,
  headStartClaimMaxHours: HEAD_START_CLAIM_MAX_HOURS,
  illustrativeHourlyRate: ILLUSTRATIVE_HOURLY_RATE,
  lessonProgressSaveSeconds: SAVE_INTERVAL_MS / MILLISECONDS_PER_SECOND,
  licenseWithdrawalConsentField: LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT,
  liveSiteCheckPaths: [...new Set(LIVE_SITE_CHECKS.map(({ path }) => path))],
  liveSiteCheckRetries: LIVE_SITE_CHECK_RETRY_DELAYS_MS.length,
  liveSiteCheckRetrySeconds: LIVE_SITE_CHECK_RETRY_DELAY_MS / MILLISECONDS_PER_SECOND,
  localizedTextMaxLength: LOCALIZED_TEXT_MAX_LENGTH,
  navigationPendingMinMs: NAVIGATION_PENDING_MIN_MS,
  navigationPendingMs: NAVIGATION_PENDING_MS,
  oauthCallbackPath: oauthCallbackPath("<provider>"),
  oauthCallbackPaths: OAUTH_PROVIDERS.map(({ id }) => oauthCallbackPath(id)),
  oauthCallbackUrls: OAUTH_PROVIDERS.map(({ id }) => `https://<host>${oauthCallbackPath(id)}`),
  oauthClientIdVariables: OAUTH_PROVIDERS.map(({ id }) => OAUTH_CLIENTS[id].clientIdVariable),
  oauthProviderIds: OAUTH_PROVIDERS.map(({ id }) => id),
  passwordMaxLength: PASSWORD_MAX_LENGTH,
  passwordMinLength: PASSWORD_MIN_LENGTH,
  posterSmallWidth: POSTER_SMALL_WIDTH,
  posterWidth: POSTER_WIDTH,
  queryGcTimeMinutes: QUERY_GC_TIME_MS / MILLISECONDS_PER_MINUTE,
  queryStaleTimeMinutes: QUERY_STALE_TIME_MS / MILLISECONDS_PER_MINUTE,
  rateLimitWindowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  reactprojectsAccess: REACTPROJECTS_ACCESS,
  recipientEmailsPerHour: RECIPIENT_EMAILS_PER_HOUR,
  refundWithdrawalDays: REFUND_TERMS.WITHDRAWAL_DAYS,
  regionalDiscountsRefreshMinutes: REGIONAL_DISCOUNTS_REFRESH_AFTER_MS / MILLISECONDS_PER_MINUTE,
  routerStaleTimeMinutes: QUERY_STALE_TIME_MS / MILLISECONDS_PER_MINUTE,
  scaffoldTarget: SCAFFOLD_TARGET,
  secretPlaceholderBrackets: SECRET_PLACEHOLDER_BRACKETS.map(([open, close]) => `${open}…${close}`),
  secretPlaceholderWords: SECRET_PLACEHOLDER_WORDS,
  sensitiveRateLimit: RATE_LIMITS.SENSITIVE.max,
  signedMediaHours: PLAYBACK_TTL_SECONDS / SECONDS_PER_HOUR,
  slugMaxLength: SLUG_MAX_LENGTH,
  socialImageHeight: SOCIAL_IMAGE.HEIGHT,
  socialImageWidth: SOCIAL_IMAGE.WIDTH,
  socialSignInPath: SOCIAL_SIGN_IN_PATH,
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
  cliCredentialDirectories: [
    [PLATFORM.LINUX, CLI_CREDENTIALS_DIRECTORY.LINUX],
    [PLATFORM.MACOS, CLI_CREDENTIALS_DIRECTORY.MACOS],
    [PLATFORM.WINDOWS, CLI_CREDENTIALS_DIRECTORY.WINDOWS],
  ],
  cliRunners: PACKAGE_MANAGERS.map(({ exec, id }) => [id, `${exec} ${CLI_PACKAGE_SPEC} ${CLI_COMMAND.ACTIVATE}`] as const),
  commitTypes: Object.entries(commitEmojis),
  formsOfAddress: I18N.SUPPORTED_LOCALES.filter((locale) => locale !== I18N.DEFAULT_LOCALE).map((locale) => {
    const { form, never, neverEndingSentence, neverInsideSentence } = FORMS_OF_ADDRESS[locale]

    return [locale, form, never, neverInsideSentence, neverEndingSentence] as const
  }),
  pppTiers: PPP_TIERS.map(({ countries, multiplier }) => [multiplier, countries] as const),
  seededAccounts,
} satisfies Record<string, readonly (readonly [number | string, ...Value[]])[]>

const UNIT_FORMATS = {
  currency: CURRENCY_FORMAT,
  day: { style: "unit", unit: "day", unitDisplay: "long" },
  hour: { style: "unit", unit: "hour", unitDisplay: "long" },
  millisecond: { style: "unit", unit: "millisecond", unitDisplay: "short" },
  minute: { style: "unit", unit: "minute", unitDisplay: "long" },
  payout: { currency: AFFILIATE_TERMS.PAYOUT_CURRENCY, style: "currency", trailingZeroDisplay: "stripIfInteger" },
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
