import * as zod from "zod"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

export const AUTH_ERRORS = {
  ACCESS_DENIED: "signInCancelled",
  ACCOUNT_NOT_LINKED: "accountNotLinked",
  ACCOUNT_TEMPORARILY_LOCKED: "accountLocked",
  BACKUP_CODES_NOT_ENABLED: "twoFactorNotEnabled",
  BANNED_USER: "accountSuspended",
  BODY_MUST_BE_AN_OBJECT: "invalidInput",
  CHANGE_EMAIL_DISABLED: "emailChangeUnavailable",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "passwordNotSet",
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "requestBlocked",
  EMAIL_ALREADY_VERIFIED: "emailAlreadyVerified",
  EMAIL_CAN_NOT_BE_UPDATED: "emailChangeUnavailable",
  EMAIL_MISMATCH: "emailMismatch",
  EMAIL_NOT_FOUND: "socialSignInFailed",
  EMAIL_NOT_VERIFIED: "emailNotVerified",
  FAILED_TO_GET_SESSION: "sessionExpired",
  FIELD_NOT_ALLOWED: "invalidInput",
  INVALID_BACKUP_CODE: "invalidBackupCode",
  INVALID_CALLBACK_REQUEST: "socialSignInFailed",
  INVALID_CALLBACK_URL: "requestBlocked",
  INVALID_CODE: "invalidCode",
  INVALID_EMAIL: "invalidEmail",
  INVALID_EMAIL_OR_PASSWORD: "invalidEmailOrPassword",
  INVALID_ERROR_CALLBACK_URL: "requestBlocked",
  INVALID_NEW_USER_CALLBACK_URL: "requestBlocked",
  INVALID_ORIGIN: "requestBlocked",
  INVALID_PASSWORD: "invalidPassword",
  INVALID_REDIRECT_URL: "requestBlocked",
  INVALID_REQUEST: "socialSignInFailed",
  INVALID_ROLE_TYPE: "invalidRole",
  INVALID_SCOPE: "socialSignInFailed",
  INVALID_TOKEN: "invalidLink",
  INVALID_TWO_FACTOR_COOKIE: "sessionExpired",
  ISSUER_MISMATCH: "socialSignInFailed",
  MISSING_FIELD: "invalidInput",
  MISSING_OR_NULL_ORIGIN: "requestBlocked",
  NONCE_BINDING_MISSING: "socialSignInFailed",
  NO_CODE: "socialSignInFailed",
  OAUTH_PROVIDER_NOT_FOUND: "socialSignInFailed",
  PASSWORD_COMPROMISED: "passwordCompromised",
  PASSWORD_TOO_LONG: "passwordTooLong",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  PROVIDER_NOT_FOUND: "socialSignInFailed",
  SERVER_ERROR: "socialSignInFailed",
  SESSION_EXPIRED: "sessionExpired",
  SESSION_NOT_FRESH: "sessionExpired",
  STATE_INVALID: "socialSignInFailed",
  STATE_MISMATCH: "socialSignInFailed",
  STATE_NOT_FOUND: "socialSignInFailed",
  TEMPORARILY_UNAVAILABLE: "socialSignInFailed",
  TOKEN_EXPIRED: "invalidLink",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "tooManyAttempts",
  TOO_MANY_REQUESTS: "tooManyRequests",
  TOTP_ALREADY_ENABLED: "twoFactorAlreadyEnabled",
  TOTP_NOT_ENABLED: "twoFactorNotEnabled",
  TWO_FACTOR_NOT_ENABLED: "twoFactorNotEnabled",
  UNABLE_TO_CREATE_SESSION: "socialSignInFailed",
  UNABLE_TO_CREATE_USER: "socialSignInFailed",
  UNABLE_TO_GET_USER_INFO: "socialSignInFailed",
  UNABLE_TO_LINK_ACCOUNT: "socialSignInFailed",
  UNABLE_TO_UPDATE_ACCOUNT: "socialSignInFailed",
  UNAUTHORIZED: "sessionExpired",
  UNAUTHORIZED_CLIENT: "socialSignInFailed",
  UNKNOWN_ERROR: "unknownError",
  UNSUPPORTED_RESPONSE_TYPE: "socialSignInFailed",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userAlreadyExists",
  USER_NOT_FOUND: "userNotFound",
  VALIDATION_ERROR: "invalidInput",
  YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_GET_USER: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE: "invalidRole",
  YOU_ARE_NOT_ALLOWED_TO_SET_USERS_EMAIL: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD: "forbidden",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS: "forbidden",
  YOU_CANNOT_BAN_YOURSELF: "cannotChangeOwnAccount",
  YOU_CANNOT_IMPERSONATE_ADMINS: "cannotImpersonateAdmins",
  YOU_CANNOT_REMOVE_YOURSELF: "cannotChangeOwnAccount",
} as const

export type AuthErrorMessageKey = (typeof AUTH_ERRORS)[keyof typeof AUTH_ERRORS]

export const SESSION_EXPIRED_CODE = "SESSION_EXPIRED" satisfies keyof typeof AUTH_ERRORS

const AUTH_ERROR_BY_CODE = new Map<string, AuthErrorMessageKey>(Object.entries(AUTH_ERRORS))

const errorKeyOf = (code: unknown): AuthErrorMessageKey | undefined => AUTH_ERROR_BY_CODE.get(String(code).toUpperCase())

const errorFieldsSchema = zod
  .object({ body: zod.unknown(), code: zod.unknown(), status: zod.unknown(), statusCode: zod.unknown() })
  .partial()

const searchErrorKeySchema = zod
  .string()
  .nonempty()
  .transform((code) => errorKeyOf(code) ?? AUTH_ERRORS.UNKNOWN_ERROR)

const errorFieldsOf = (value: unknown): zod.infer<typeof errorFieldsSchema> => errorFieldsSchema.safeParse(value).data ?? {}

export const authErrorKey = (error: unknown): AuthErrorMessageKey => {
  const { body, code, status, statusCode } = errorFieldsOf(error)
  const key = errorKeyOf(code ?? errorFieldsOf(body).code)

  if (key !== undefined) {
    return key
  }

  if ([status, statusCode].includes(HTTP_STATUS.TOO_MANY_REQUESTS)) {
    return AUTH_ERRORS.TOO_MANY_REQUESTS
  }

  return AUTH_ERRORS.UNKNOWN_ERROR
}

export const authErrorKeyFromSearch = (error: string | undefined): AuthErrorMessageKey | undefined =>
  searchErrorKeySchema.safeParse(error).data
