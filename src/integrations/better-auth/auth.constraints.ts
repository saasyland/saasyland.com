export const BACKUP_CODE_MAX_LENGTH = 12
export const BACKUP_CODE_MIN_LENGTH = 8

export const EMAIL_MAX_LENGTH = 64
export const NAME_MAX_LENGTH = 100

export const IMAGE_URL_MAX_LENGTH = 2048

export const PASSWORD_MAX_LENGTH = 1024
export const PASSWORD_MIN_LENGTH = 12

export const TWO_FACTOR_CODE_LENGTH = 6

export const AUTH_VALIDATION_PARAMS: Record<string, Record<string, number>> = {
  backupCodeMaxLength: { max: BACKUP_CODE_MAX_LENGTH },
  emailMaxLength: { max: EMAIL_MAX_LENGTH },
  nameMaxLength: { max: NAME_MAX_LENGTH },
  passwordMaxLength: { max: PASSWORD_MAX_LENGTH },
  passwordMinLength: { min: PASSWORD_MIN_LENGTH },
  twoFactorCodeLength: { length: TWO_FACTOR_CODE_LENGTH },
}
