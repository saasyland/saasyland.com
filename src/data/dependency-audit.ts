export const ADVISORY_SEVERITY = {
  CRITICAL: "critical",
  HIGH: "high",
  LOW: "low",
  MODERATE: "moderate",
} as const

export type AdvisorySeverity = (typeof ADVISORY_SEVERITY)[keyof typeof ADVISORY_SEVERITY]

export const BLOCKING_SEVERITIES: readonly AdvisorySeverity[] = [ADVISORY_SEVERITY.HIGH, ADVISORY_SEVERITY.CRITICAL]

export const AUDIT_EXCEPTION_MAX_DAYS = 90

export interface AuditException {
  readonly advisory: string
  readonly expiresOn: string
  readonly package: string
  readonly reason: string
  readonly reviewedOn: string
  readonly tracking: string
}

export const AUDIT_EXCEPTIONS: readonly AuditException[] = []
