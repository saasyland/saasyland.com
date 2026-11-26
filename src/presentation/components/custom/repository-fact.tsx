import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"
import { STACK_CHOICES, STACK_EXTRAS } from "@saasyland/stack"
import { CI_PROVIDER, CI_PROVIDERS, CI_REPOSITORY_VARIABLE, PLATFORM } from "@saasyland/stack/api"
import { CLI_VARIABLE, CREDENTIALS_STORE, EXIT_CODE } from "@saasyland/stack/cli"
import { adminAc } from "better-auth/plugins/admin/access"
import type { TranslationValues } from "use-intl"
import { useFormatter, useTranslations } from "use-intl/react"
import {
  cliApiTables,
  commitEmojis,
  coverageScope,
  flowTables,
  moduleTables,
  seededAccounts,
  testViewports,
} from "virtual:repository-facts"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import { APP_STATEMENTS } from "~/src/integrations/better-auth/auth.access"
import { AUTH_PROVIDER, EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import {
  BACKUP_CODE_MAX_LENGTH,
  BACKUP_CODE_MIN_LENGTH,
  DECLARED_COLUMN_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TWO_FACTOR_CODE_LENGTH,
} from "~/src/integrations/better-auth/auth.constraints"
import { RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS } from "~/src/integrations/better-auth/auth.middleware"
import { RESEND_BATCH_LIMIT } from "~/src/integrations/resend/resend.constants"
import { QUERY_GC_TIME_MS, QUERY_STALE_TIME_MS, ROUTER_PRELOAD_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { DATA_GRID_DENSITIES, DATA_GRID_FILTER, DATA_GRID_TYPING_DELAY_MS } from "~/src/integrations/tanstack-table/table.features"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import {
  LOCALIZED_LIST_ITEM_MAX_LENGTH,
  LOCALIZED_LIST_MAX_ITEMS,
  LOCALIZED_TEXT_MAX_LENGTH,
} from "~/src/modules/_core/utils/localized-text"
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SORTED_COLUMNS, PAGE_SIZES, SEARCH_MAX_LENGTH } from "~/src/modules/_core/utils/pagination"
import { DEFAULT_TIME_RANGE, TIME_RANGES } from "~/src/modules/_core/utils/time-series"
import { SLUG_MAX_LENGTH } from "~/src/modules/_core/utils/zod-fields"
import {
  COURSE_DOCUMENT,
  COURSE_DOCUMENT_MAX_LENGTH,
  COURSE_ICONS,
  COURSE_IMPORTS_PER_MINUTE,
  COURSE_IMPORT_PROBLEMS_MAX,
  COURSE_LEVELS,
  COURSE_SHOWCASE,
  COURSE_STALE_MS,
} from "~/src/modules/course/course.constants"
import {
  COURSE_COVER_MAX_MEGABYTES,
  COURSE_COVER_SIZE,
  COURSE_COVER_SOURCE_TYPES,
  COURSE_COVER_UPLOADS_PER_MINUTE,
  COURSE_COVER_WIDTHS,
} from "~/src/modules/course/course.cover"
import {
  LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS,
  LESSON_ATTACHMENT_EXTENSIONS,
  LESSON_ATTACHMENT_MAX_MEGABYTES,
  LESSON_ATTACHMENT_UPLOADS_PER_MINUTE,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { LESSON_PROGRESS_SAVE_INTERVAL_MS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import {
  LESSON_DESCRIPTION_MAX_LENGTH,
  LESSON_FORMATS,
  LESSON_KEY_MOMENTS_MAX_ITEMS,
  LESSON_PLAYBACK_STALE_MS,
} from "~/src/modules/lesson/lesson.constants"
import {
  BUNDLE_ARCHIVE_EXTENSION,
  BUNDLE_BINDING,
  BUNDLE_CONTENT_TYPE,
  BUNDLE_METADATA,
  BUNDLE_PATH_PREFIX,
  LICENSE_ACTIVATIONS_STALE_MS,
  LICENSE_ACTIVATIONS_TIMEOUT_SECONDS,
  LICENSE_API_RETRY_AFTER_SECONDS,
  LICENSE_CHECKOUT_FIELD,
  LICENSE_POLL_MS,
  LICENSE_TIERS,
  type LicenseTier,
} from "~/src/modules/license/license.constants"
import { PPP_TIERS } from "~/src/modules/license/license.pricing"
import {
  NEWSLETTER_ISSUE_BATCHES_PER_STEP,
  NEWSLETTER_ISSUE_BODY_MAX_LENGTH,
  NEWSLETTER_ISSUE_LEASE_SECONDS,
  NEWSLETTER_ISSUE_RATE_LIMIT,
  NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH,
} from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { CONFIRMATION_WINDOW_IN_HOURS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { CHECKOUT_RATE_LIMIT, REVENUE_ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"
import { SESSION_STALE_TIME_MS } from "~/src/modules/session/session.constants"
import { RESEND_COOLDOWN_SECONDS, VERIFICATION_POLL_MS } from "~/src/modules/verification/verification.constants"
import {
  VIDEO_UPLOADS_PER_MINUTE,
  VIDEO_UPLOAD_CONCURRENCY,
  VIDEO_UPLOAD_EXTENSIONS,
  VIDEO_UPLOAD_MAX_GIGABYTES,
  VIDEO_UPLOAD_PART_ATTEMPTS,
  VIDEO_UPLOAD_PART_MEGABYTES,
  VIDEO_UPLOAD_POLL_MS,
} from "~/src/modules/video-upload/video-upload.constants"
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

import { ADMIN_DASHBOARD_PREVIEW_PAGINATION } from "~/src/data/admin"
import { AFFILIATE_PORTAL_URL, AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { OAUTH_CLIENTS, OAUTH_PROVIDERS, SOCIAL_SIGN_IN_PATH } from "~/src/data/auth"
import {
  CLI_COMMAND,
  CLI_EXEC,
  CLI_GENERATION,
  CLI_INIT_COMMAND,
  CLI_KEY_LINES,
  CLI_PACKAGE_SPEC,
  CLI_RELEASE_CHANNEL,
  CLI_SETUP_LINES,
  CLI_TEMPLATE_SUPPORT,
  PACKAGE_MANAGERS,
  SCAFFOLD_TARGET,
} from "~/src/data/cli"
import { DATA_GRID_ACTIONS_SIZE, DATA_GRID_DATE_PRESETS } from "~/src/data/data-grid"
import { AUDIT_EXCEPTION_MAX_DAYS, BLOCKING_SEVERITIES } from "~/src/data/dependency-audit"
import { GERMAN_NAMES, GERMAN_PHRASES, GERMAN_TERMS } from "~/src/data/german-glossary"
import { HEAD_START_CLAIM_MAX_HOURS } from "~/src/data/head-start"
import { CORE_PRICE_IN_HOURS, TIER_SUPPORT_VALUES } from "~/src/data/license"
import { LOCAL_SERVER_ORIGIN, TEST_SERVER_PORTS } from "~/src/data/local-server"
import {
  ANGULARPROJECTS_ACCESS,
  BILLING_GENERATION,
  ILLUSTRATIVE_HOURLY_RATE,
  REACTPROJECTS_ACCESS,
  TEAM_SEATS_ACCESS,
} from "~/src/data/marketing"
import {
  FEATURE_STATUS,
  FEATURE_STATUSES,
  type FeatureStatus,
  NAVIGATION_PENDING_MIN_MS,
  NAVIGATION_PENDING_MS,
  NAVIGATION_PRELOAD_DELAY_MS,
} from "~/src/data/navigation.constants"
import { NEWSLETTER_SENDING } from "~/src/data/newsletter"
import { POLISH_NAMES, POLISH_PHRASES, POLISH_TERMS } from "~/src/data/polish-glossary"
import { REFUND_TERMS } from "~/src/data/refunds"
import { SECURITY_RESPONSE_WORKING_DAYS, SECURITY_TXT_LANGUAGES } from "~/src/data/security"
import { SKILL_SOURCES } from "~/src/data/skills"

import { oauthCallbackPath } from "~/src/lib/auth"
import { CHECKOUT_OVERLAY_GRACE_MS } from "~/src/lib/checkout-overlay"
import { cliCommand } from "~/src/lib/cli"
import { cn } from "~/src/lib/cn"
import { SECRET_PLACEHOLDER_BRACKETS, SECRET_PLACEHOLDER_WORDS } from "~/src/lib/deploy-secrets"
import { LIVE_SITE_CHECKS, LIVE_SITE_CHECK_RETRY_DELAYS_MS, LIVE_SITE_CHECK_RETRY_DELAY_MS } from "~/src/lib/deployment"
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_MINUTE, MILLISECONDS_PER_SECOND, SECONDS_PER_HOUR } from "~/src/lib/duration"
import { FORMS_OF_ADDRESS } from "~/src/lib/forms-of-address"
import { STAR_COUNT_FETCH_TIMEOUT_MS, STAR_COUNT_REFRESH_AFTER_MS } from "~/src/lib/github"
import { POLISH_GLOSSARY, neverTermText } from "~/src/lib/glossary-terms"
import { IDLE_FALLBACK_DELAY_MS } from "~/src/lib/idle-preload"
import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"
import { SOCIAL_IMAGE } from "~/src/lib/seo"
import { TIER_FEATURE_VALUES, tierFeaturesWith } from "~/src/lib/tier-features"

import { ACTIVATION_POLL_MS, ACTIVATION_TIMEOUT_MS } from "~/src/presentation/components/custom/app/checkout-activation"
import {
  CHECKOUT_CONFIRMATION_POLL_MS,
  CHECKOUT_CONFIRMATION_TIMEOUT_MS,
} from "~/src/presentation/components/custom/billing/checkout-confirmation"

import { REQUEST_RENDERED_ROUTES, ROUTES } from "~/src/routes"

type Value = number | string | readonly string[]

interface Label {
  readonly label: string
  readonly values?: TranslationValues
}

interface Text {
  readonly text: string
}

type Cell = Label | Text | Value

type Row = readonly [Cell, ...Cell[]]

const OCTAL_RADIX = 8
const WORD_SEPARATOR = " "
const LINE_SEPARATOR = "\n"
const FILE_MODE_DIGITS = 4

const renditionName = (height: number): string => `${String(height)}p`

const statusLabel = (status: FeatureStatus): Label => ({ label: `components.custom.pricing.status.${status}` })

const generationStatus = (supported: readonly string[], id: string): Label =>
  statusLabel(supported.includes(id) ? CLI_GENERATION : FEATURE_STATUS.ARRIVING)

const flowFeature = (feature: string): Label => ({ label: `flow-features.${feature}` })

const tierFeatureRows = (tier: LicenseTier) =>
  FEATURE_STATUSES.flatMap((status) =>
    tierFeaturesWith(tier, status).map(
      ({ id }) =>
        [
          { label: `components.custom.pricing.tiers.${tier}.name` },
          { label: `components.custom.pricing.tiers.${tier}.features.${id}`, values: TIER_FEATURE_VALUES },
          statusLabel(status),
        ] as const,
    ),
  )

const glossaryTable = (rows: readonly (readonly [string, readonly string[], readonly string[]])[]): readonly Row[] =>
  rows.map(([meaning, preferred, never]) => [meaning, preferred, never.map((term) => neverTermText(term))] as const)

const FACTS = {
  ...REPOSITORY_FACTS,
  ...TIER_SUPPORT_VALUES,
  ...testViewports,
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
  attachmentFileTypes: LESSON_ATTACHMENT_EXTENSIONS,
  attachmentMaxMegabytes: LESSON_ATTACHMENT_MAX_MEGABYTES,
  attachmentUploadsPerMinute: LESSON_ATTACHMENT_UPLOADS_PER_MINUTE,
  audioBitrate: AUDIO_BITRATE,
  audioSampleRate: AUDIO_SAMPLE_RATE,
  auditBlockingSeverities: BLOCKING_SEVERITIES,
  auditExceptionMaxDays: AUDIT_EXCEPTION_MAX_DAYS,
  backupCodeMaxLength: BACKUP_CODE_MAX_LENGTH,
  backupCodeMinLength: BACKUP_CODE_MIN_LENGTH,
  billingGeneration: BILLING_GENERATION,
  checkoutConfirmationPollSeconds: CHECKOUT_CONFIRMATION_POLL_MS / MILLISECONDS_PER_SECOND,
  checkoutConfirmationTimeoutSeconds: CHECKOUT_CONFIRMATION_TIMEOUT_MS / MILLISECONDS_PER_SECOND,
  checkoutOverlayGraceSeconds: CHECKOUT_OVERLAY_GRACE_MS / MILLISECONDS_PER_SECOND,
  checkoutsPerMinute: CHECKOUT_RATE_LIMIT.max,
  cliActivate: cliCommand(CLI_COMMAND.ACTIVATE),
  cliApiRetryAfterSeconds: LICENSE_API_RETRY_AFTER_SECONDS,
  cliApiUrlVariable: CLI_VARIABLE.API_URL,
  cliBundleBinding: BUNDLE_BINDING,
  cliBundleContentType: BUNDLE_CONTENT_TYPE,
  cliBundleDigestMetadata: BUNDLE_METADATA.SHA256,
  cliBundleKey: `<version>${BUNDLE_ARCHIVE_EXTENSION}`,
  cliBundleUrlPath: `${BUNDLE_PATH_PREFIX}/<expiry>.<signature>/<version>${BUNDLE_ARCHIVE_EXTENSION}`,
  cliCiProviders: CI_PROVIDERS.filter(({ id }) => id !== CI_PROVIDER.CUSTOM).map(({ id }) => id),
  cliCiRepositoryVariable: CI_REPOSITORY_VARIABLE,
  cliCredentialsFile: CREDENTIALS_STORE.FILE,
  cliCredentialsFileMode: CREDENTIALS_STORE.FILE_MODE.toString(OCTAL_RADIX).padStart(FILE_MODE_DIGITS, "0"),
  cliCredentialsLinuxFallback: CREDENTIALS_STORE.DIRECTORY.LINUX_FALLBACK,
  cliDeactivate: cliCommand(CLI_COMMAND.DEACTIVATE),
  cliExec: CLI_EXEC,
  cliExitCancelled: EXIT_CODE.CANCELLED,
  cliExitFailure: EXIT_CODE.FAILURE,
  cliExitNoPermission: EXIT_CODE.NO_PERMISSION,
  cliExitNotAvailable: EXIT_CODE.NOT_AVAILABLE,
  cliExitProtocol: EXIT_CODE.PROTOCOL,
  cliExitSuccess: EXIT_CODE.SUCCESS,
  cliExitTemporaryFailure: EXIT_CODE.TEMPORARY_FAILURE,
  cliExitUsage: EXIT_CODE.USAGE,
  cliInit: cliCommand(CLI_COMMAND.INIT),
  cliInitCommand: CLI_INIT_COMMAND,
  cliLicenseCommands: CLI_KEY_LINES.map(({ command }) => command),
  cliLicenseKeyVariable: CLI_VARIABLE.LICENSE_KEY,
  cliLocaleVariable: CLI_VARIABLE.LOCALE,
  cliPackageSpec: CLI_PACKAGE_SPEC,
  cliReleaseChannel: CLI_RELEASE_CHANNEL,
  cliSetupCommands: CLI_SETUP_LINES.map(({ command }) => command),
  cliWhoami: cliCommand(CLI_COMMAND.WHOAMI),
  corePriceInHours: CORE_PRICE_IN_HOURS,
  courseCoverHeight: COURSE_COVER_SIZE.height,
  courseCoverMaxMegabytes: COURSE_COVER_MAX_MEGABYTES,
  courseCoverSourceTypes: Object.keys(COURSE_COVER_SOURCE_TYPES),
  courseCoverUploadsPerMinute: COURSE_COVER_UPLOADS_PER_MINUTE,
  courseCoverWidth: COURSE_COVER_SIZE.width,
  courseCoverWidths: COURSE_COVER_WIDTHS.map(String),
  courseDocumentFormat: COURSE_DOCUMENT.FORMAT,
  courseDocumentMaxLength: COURSE_DOCUMENT_MAX_LENGTH,
  courseDocumentVersion: COURSE_DOCUMENT.VERSION,
  courseIcons: COURSE_ICONS,
  courseImportProblemsMax: COURSE_IMPORT_PROBLEMS_MAX,
  courseImportsPerMinute: COURSE_IMPORTS_PER_MINUTE,
  courseLevels: COURSE_LEVELS,
  courseShowcaseCourses: COURSE_SHOWCASE.COURSES,
  courseShowcaseLessons: COURSE_SHOWCASE.LESSONS,
  courseStaleMinutes: COURSE_STALE_MS / MILLISECONDS_PER_MINUTE,
  coverageExclude: coverageScope.exclude,
  coverageInclude: coverageScope.include,
  dashboardRanges: TIME_RANGES,
  dataGridActionsSize: DATA_GRID_ACTIONS_SIZE,
  dataGridDatePresets: DATA_GRID_DATE_PRESETS.map(({ name }) => name),
  dataGridDensities: DATA_GRID_DENSITIES,
  dataGridExportPageSize: MAX_PAGE_SIZE,
  dataGridFilterKinds: Object.values(DATA_GRID_FILTER),
  dataGridMaxSortedColumns: MAX_SORTED_COLUMNS,
  dataGridPageSizes: PAGE_SIZES.map(String),
  dataGridSearchMaxLength: SEARCH_MAX_LENGTH,
  dataGridTypingDelayMs: DATA_GRID_TYPING_DELAY_MS,
  declaredEmailColumnLength: DECLARED_COLUMN_LENGTH.EMAIL,
  declaredNameColumnLength: DECLARED_COLUMN_LENGTH.NAME,
  defaultDashboardRange: DEFAULT_TIME_RANGE,
  defaultPageSize: DEFAULT_PAGE_SIZE,
  emailLinkHours: EMAIL_LINK_LIFETIME_HOURS,
  emailMaxLength: EMAIL_MAX_LENGTH,
  googleCallbackUrl: `https://<host>${oauthCallbackPath(AUTH_PROVIDER.GOOGLE)}`,
  headStartClaimMaxHours: HEAD_START_CLAIM_MAX_HOURS,
  idleFallbackDelayMs: IDLE_FALLBACK_DELAY_MS,
  illustrativeHourlyRate: ILLUSTRATIVE_HOURLY_RATE,
  lessonDescriptionMaxLength: LESSON_DESCRIPTION_MAX_LENGTH,
  lessonFormats: LESSON_FORMATS,
  lessonKeyMomentsMaxItems: LESSON_KEY_MOMENTS_MAX_ITEMS,
  lessonPlaybackStaleHours: LESSON_PLAYBACK_STALE_MS / MILLISECONDS_PER_HOUR,
  lessonProgressSaveSeconds: LESSON_PROGRESS_SAVE_INTERVAL_MS / MILLISECONDS_PER_SECOND,
  licenseActivationsStaleMinutes: LICENSE_ACTIVATIONS_STALE_MS / MILLISECONDS_PER_MINUTE,
  licenseActivationsTimeoutSeconds: LICENSE_ACTIVATIONS_TIMEOUT_SECONDS,
  licenseKeyPollSeconds: LICENSE_POLL_MS.KEY / MILLISECONDS_PER_SECOND,
  licenseSetupPollSeconds: LICENSE_POLL_MS.SETUP / MILLISECONDS_PER_SECOND,
  licenseWithdrawalConsentField: LICENSE_CHECKOUT_FIELD.WITHDRAWAL_CONSENT,
  liveSiteCheckPaths: [...new Set(LIVE_SITE_CHECKS.map(({ path }) => path))],
  liveSiteCheckRetries: LIVE_SITE_CHECK_RETRY_DELAYS_MS.length,
  liveSiteCheckRetrySeconds: LIVE_SITE_CHECK_RETRY_DELAY_MS / MILLISECONDS_PER_SECOND,
  localServerOrigin: LOCAL_SERVER_ORIGIN,
  localizedListItemMaxLength: LOCALIZED_LIST_ITEM_MAX_LENGTH,
  localizedListMaxItems: LOCALIZED_LIST_MAX_ITEMS,
  localizedTextMaxLength: LOCALIZED_TEXT_MAX_LENGTH,
  modules: moduleTables.modules.map(([module]) => module),
  nameMaxLength: NAME_MAX_LENGTH,
  navigationPendingMinMs: NAVIGATION_PENDING_MIN_MS,
  navigationPendingMs: NAVIGATION_PENDING_MS,
  navigationPreloadDelayMs: NAVIGATION_PRELOAD_DELAY_MS,
  newsletterBatchSize: RESEND_BATCH_LIMIT,
  newsletterBatchesPerStep: NEWSLETTER_ISSUE_BATCHES_PER_STEP,
  newsletterBodyMaxLength: NEWSLETTER_ISSUE_BODY_MAX_LENGTH,
  newsletterConfirmationHours: CONFIRMATION_WINDOW_IN_HOURS,
  newsletterLeaseSeconds: NEWSLETTER_ISSUE_LEASE_SECONDS,
  newsletterRateLimit: NEWSLETTER_ISSUE_RATE_LIMIT.max,
  newsletterSending: NEWSLETTER_SENDING,
  newsletterStepRecipients: NEWSLETTER_ISSUE_BATCHES_PER_STEP * RESEND_BATCH_LIMIT,
  newsletterSubjectMaxLength: NEWSLETTER_ISSUE_SUBJECT_MAX_LENGTH,
  oauthCallbackPath: oauthCallbackPath("<provider>"),
  oauthCallbackPaths: OAUTH_PROVIDERS.map(({ id }) => oauthCallbackPath(id)),
  oauthCallbackUrls: OAUTH_PROVIDERS.map(({ id }) => `https://<host>${oauthCallbackPath(id)}`),
  oauthClientIdVariables: OAUTH_PROVIDERS.map(({ id }) => OAUTH_CLIENTS[id].clientIdVariable),
  oauthProviderIds: OAUTH_PROVIDERS.map(({ id }) => id),
  passwordMaxLength: PASSWORD_MAX_LENGTH,
  passwordMinLength: PASSWORD_MIN_LENGTH,
  plainUseCases: moduleTables.plainUseCases,
  polishContextTerms: POLISH_GLOSSARY.contextTerms,
  posterSmallWidth: POSTER_SMALL_WIDTH,
  posterWidth: POSTER_WIDTH,
  publicUseCases: moduleTables.publicUseCases,
  queryGcTimeMinutes: QUERY_GC_TIME_MS / MILLISECONDS_PER_MINUTE,
  queryStaleTimeMinutes: QUERY_STALE_TIME_MS / MILLISECONDS_PER_MINUTE,
  rateLimitWindowSeconds: RATE_LIMIT_WINDOW_SECONDS,
  reactprojectsAccess: REACTPROJECTS_ACCESS,
  recipientEmailsPerHour: RECIPIENT_EMAILS_PER_HOUR,
  refundReimbursementDays: REFUND_TERMS.REIMBURSEMENT_DAYS,
  refundWithdrawalDays: REFUND_TERMS.WITHDRAWAL_DAYS,
  requestRenderedRoutes: REQUEST_RENDERED_ROUTES,
  resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
  revenueOrderStatuses: REVENUE_ORDER_STATUSES,
  routerPreloadStaleTimeMs: ROUTER_PRELOAD_STALE_TIME_MS,
  scaffoldTarget: SCAFFOLD_TARGET,
  secretPlaceholderBrackets: SECRET_PLACEHOLDER_BRACKETS.map(([open, close]) => `${open}…${close}`),
  secretPlaceholderWords: SECRET_PLACEHOLDER_WORDS,
  securityAcknowledgeWorkingDays: SECURITY_RESPONSE_WORKING_DAYS.ACKNOWLEDGE,
  securityAssessWorkingDays: SECURITY_RESPONSE_WORKING_DAYS.ASSESS,
  securityTxtLanguages: SECURITY_TXT_LANGUAGES,
  securityTxtPath: ROUTES.WELL_KNOWN.SECURITY_TXT,
  sensitiveRateLimit: RATE_LIMITS.SENSITIVE.max,
  sessionStaleTimeMinutes: SESSION_STALE_TIME_MS / MILLISECONDS_PER_MINUTE,
  signedDownloadHours: LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS / SECONDS_PER_HOUR,
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
  teamSeatsAccess: TEAM_SEATS_ACCESS,
  testServerFirstPort: String(TEST_SERVER_PORTS.FIRST),
  testServerLastPort: String(TEST_SERVER_PORTS.LAST),
  tokenRateLimit: RATE_LIMITS.TOKEN.max,
  twoFactorCodeLength: TWO_FACTOR_CODE_LENGTH,
  uncheckedStatements: Object.entries(APP_STATEMENTS).flatMap(([resource, actions]) =>
    actions
      .filter((action) => !moduleTables.checkedPermissions.includes(`${resource}.${action}`))
      .map((action) => `${resource}: ["${action}"]`),
  ),
  verificationPollSeconds: VERIFICATION_POLL_MS / MILLISECONDS_PER_SECOND,
  videoKeyframeSeconds: KEYFRAME_SECONDS,
  videoLibraryPageSize: VIDEO_LIBRARY_PAGE_SIZE,
  videoLowerRenditions: LOWER_RENDITION_HEIGHTS.map((height) => renditionName(height)),
  videoQualityCrf: VIDEO_QUALITY_CRF,
  videoSegmentSeconds: SEGMENT_SECONDS,
  videoTopRendition: renditionName(MAX_RENDITION_HEIGHT),
  videoUploadConcurrency: VIDEO_UPLOAD_CONCURRENCY,
  videoUploadFileTypes: VIDEO_UPLOAD_EXTENSIONS,
  videoUploadMaxGigabytes: VIDEO_UPLOAD_MAX_GIGABYTES,
  videoUploadPartAttempts: VIDEO_UPLOAD_PART_ATTEMPTS,
  videoUploadPartMegabytes: VIDEO_UPLOAD_PART_MEGABYTES,
  videoUploadPollSeconds: VIDEO_UPLOAD_POLL_MS / MILLISECONDS_PER_SECOND,
  videoUploadsPerMinute: VIDEO_UPLOADS_PER_MINUTE,
  vitestProjects: coverageScope.projects,
} satisfies Record<string, Value>

const TABLES = {
  adminStatements: Object.entries(adminAc.statements),
  appStatements: Object.entries(APP_STATEMENTS),
  cliApiEndpoints: cliApiTables.endpoints,
  cliApiErrors: cliApiTables.errors,
  cliBundleBuckets: cliApiTables.bundleBuckets,
  cliCredentialDirectories: [
    [PLATFORM.LINUX, CREDENTIALS_STORE.DIRECTORY.LINUX],
    [PLATFORM.MACOS, CREDENTIALS_STORE.DIRECTORY.MACOS],
    [PLATFORM.WINDOWS, CREDENTIALS_STORE.DIRECTORY.WINDOWS],
  ],
  cliExtras: STACK_EXTRAS.map(
    ({ id }) => [{ label: `stack.extras.options.${id}` }, generationStatus(CLI_TEMPLATE_SUPPORT.extras, id)] as const,
  ),
  cliOptions: STACK_CHOICES.flatMap((choice) =>
    choice.options.map(
      ({ id }) =>
        [
          { label: `stack.${choice.id}.label` },
          { label: `stack.${choice.id}.options.${id}` },
          generationStatus(CLI_TEMPLATE_SUPPORT.choices[choice.id], id),
        ] as const,
    ),
  ),
  cliRunners: PACKAGE_MANAGERS.map(({ exec, id }) => [id, `${exec} ${CLI_PACKAGE_SPEC} ${CLI_COMMAND.ACTIVATE}`] as const),
  commitTypes: Object.entries(commitEmojis),
  coveredFlowTable: flowTables.covered.map(
    ([id, feature, outcome, tests]) => [flowFeature(feature), id, { text: outcome }, { text: tests.join(LINE_SEPARATOR) }] as const,
  ),
  flowFeatureTable: flowTables.features.map(
    ([feature, flows, covered, missing, toBuild]) => [flowFeature(feature), flows, covered, missing, toBuild] as const,
  ),
  formsOfAddress: I18N.SUPPORTED_LOCALES.filter((locale) => locale !== I18N.DEFAULT_LOCALE).map((locale) => {
    const { clauseOpeners, form, never, neverEndingSentence, neverInsideSentence, neverStartingClause } = FORMS_OF_ADDRESS[locale]

    return [locale, form, never, neverInsideSentence, neverEndingSentence, neverStartingClause, clauseOpeners] as const
  }),
  germanNames: glossaryTable(GERMAN_NAMES),
  germanPhrases: glossaryTable(GERMAN_PHRASES),
  germanTerms: glossaryTable(GERMAN_TERMS),
  missingFlowGaps: flowTables.missing.map(
    ([, feature, outcome, reason]) => [flowFeature(feature), { text: outcome }, { text: reason }] as const,
  ),
  missingFlowTable: flowTables.missing.map(
    ([id, feature, outcome, reason, tests]) =>
      [flowFeature(feature), id, { text: outcome }, { text: reason }, { text: tests.join(LINE_SEPARATOR) }] as const,
  ),
  moduleUseCases: moduleTables.modules,
  permissionChecks: moduleTables.permissions,
  polishNames: glossaryTable(POLISH_NAMES),
  polishPhrases: glossaryTable(POLISH_PHRASES),
  polishTerms: glossaryTable(POLISH_TERMS),
  pppTiers: PPP_TIERS.map(({ countries, multiplier }) => [multiplier, countries] as const),
  seededAccounts,
  skillSources: Object.entries(SKILL_SOURCES).map(([source, { group, packages }]) => [source, group, packages] as const),
  tierFeatures: LICENSE_TIERS.flatMap((tier) => tierFeatureRows(tier)),
  toBuildFlowGaps: flowTables.toBuild.map(
    ([, feature, outcome, reason]) => [flowFeature(feature), { text: outcome }, { text: reason }] as const,
  ),
  toBuildFlowTable: flowTables.toBuild.map(
    ([id, feature, outcome, reason]) => [flowFeature(feature), id, { text: outcome }, { text: reason }] as const,
  ),
} satisfies Record<string, readonly Row[]>

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
    return <>{format.number(value, unit && UNIT_FORMATS[unit])}</>
  }

  if (typeof value === "string") {
    return <code>{value}</code>
  }

  return <>{format.list(value.map((item) => <code key={item}>{item}</code>))}</>
}

const CellCode = ({ value }: { readonly value: string }): JSX.Element => (
  <code className={cn({ "whitespace-nowrap": !value.includes(WORD_SEPARATOR) })}>{value}</code>
)

const LabelValue = ({ label, values }: Label): JSX.Element => {
  const t = useTranslations()

  return <>{t(label, values)}</>
}

const CellValue = ({ value }: { readonly value: Cell }): JSX.Element => {
  const format = useFormatter()

  if (typeof value === "object" && "label" in value) {
    return <LabelValue {...value} />
  }

  if (typeof value === "object" && "text" in value) {
    return <span className="whitespace-pre-line">{value.text}</span>
  }

  if (typeof value === "number") {
    return <FactValue value={value} />
  }

  if (typeof value === "string") {
    return <CellCode value={value} />
  }

  return <>{format.list(value.map((item) => <CellCode key={item} value={item} />))}</>
}

const groupRows = (rows: readonly Row[]): readonly { readonly heading: Cell; readonly rows: readonly (readonly Cell[])[] }[] => {
  const groups = new Map<string, { readonly heading: Cell; readonly rows: (readonly Cell[])[] }>()

  for (const [heading, ...cells] of rows) {
    const key = JSON.stringify(heading)
    const group = groups.get(key) ?? { heading, rows: [] }
    group.rows.push(cells)
    groups.set(key, group)
  }

  return [...groups.values()]
}

const TableHead = ({ columns }: { readonly columns: readonly string[] }): JSX.Element => (
  <thead>
    <tr>
      {columns.map((column) => (
        <th key={column}>{column}</th>
      ))}
    </tr>
  </thead>
)

const TableBody = ({
  columns,
  rows,
}: {
  readonly columns: readonly string[]
  readonly rows: readonly (readonly Cell[])[]
}): JSX.Element => (
  <tbody>
    {rows.map((row) => (
      <tr key={JSON.stringify(row)}>
        {row.map((value, index) => (
          <td key={columns[index]}>
            <CellValue value={value} />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
)

export const RepositoryFact = ({
  name,
  unit,
}: {
  readonly name: keyof typeof FACTS
  readonly unit?: keyof typeof UNIT_FORMATS
}): JSX.Element => <FactValue unit={unit} value={FACTS[name]} />

export const RepositoryTable = ({
  columns,
  grouped = false,
  name,
}: {
  readonly columns: readonly string[]
  readonly grouped?: boolean
  readonly name: keyof typeof TABLES
}): JSX.Element => {
  if (grouped) {
    return (
      <>
        {groupRows(TABLES[name]).map(({ heading, rows }) => (
          <defaultMdxComponents.table key={JSON.stringify(heading)}>
            <caption className="caption-top pb-2 text-left font-medium text-fd-foreground">
              <CellValue value={heading} />
            </caption>
            <TableHead columns={columns} />
            <TableBody columns={columns} rows={rows} />
          </defaultMdxComponents.table>
        ))}
      </>
    )
  }

  return (
    <defaultMdxComponents.table>
      <TableHead columns={columns} />
      <TableBody columns={columns} rows={TABLES[name]} />
    </defaultMdxComponents.table>
  )
}
