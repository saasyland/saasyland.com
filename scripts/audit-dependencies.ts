import { basename } from "node:path"
import process from "node:process"
import * as zod from "zod"

import {
  ADVISORY_SEVERITY,
  AUDIT_EXCEPTIONS,
  AUDIT_EXCEPTION_MAX_DAYS,
  type AdvisorySeverity,
  type AuditException,
  BLOCKING_SEVERITIES,
} from "~/src/data/dependency-audit"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

import { FAILURE_EXIT_CODE, runCommand } from "./run-command.ts"

export const AUDIT_ARGUMENTS: readonly string[] = ["audit", "--production", "--json"]

export const AUDIT_EXCEPTIONS_FILE = "src/data/dependency-audit.ts"

export const AUDIT_VERDICT = {
  FAILED: "The dependency scan failed.",
  PASSED: "No high or critical advisory affects a production dependency without a current, reviewed exception.",
} as const

const AUDIT_EXIT_CODES: readonly number[] = [0, 1]

const advisorySchema = zod.object({ severity: zod.enum(ADVISORY_SEVERITY), title: zod.string(), url: zod.url() })
const auditSchema = zod.record(zod.string(), zod.array(advisorySchema))

export interface Advisory {
  readonly id: string
  readonly package: string
  readonly severity: AdvisorySeverity
  readonly title: string
  readonly url: string
}

export interface AuditReport {
  readonly allowed: readonly Advisory[]
  readonly below: readonly Advisory[]
  readonly blocking: readonly Advisory[]
  readonly expired: readonly AuditException[]
  readonly overlong: readonly AuditException[]
  readonly unused: readonly AuditException[]
}

export const readAdvisories = (json: string): Advisory[] =>
  Object.entries(auditSchema.parse(JSON.parse(json))).flatMap(([name, advisories]) =>
    advisories.map(({ severity, title, url }) => ({ id: basename(new URL(url).pathname), package: name, severity, title, url })),
  )

const covers = (exception: AuditException, advisory: Advisory): boolean =>
  exception.advisory === advisory.id && exception.package === advisory.package

const isExpired = (exception: AuditException, now: Date): boolean => Date.parse(exception.expiresOn) <= now.getTime()

const isOverlong = ({ expiresOn, reviewedOn }: AuditException, now: Date): boolean =>
  Date.parse(reviewedOn) > now.getTime() || Date.parse(expiresOn) - Date.parse(reviewedOn) > AUDIT_EXCEPTION_MAX_DAYS * MILLISECONDS_PER_DAY

export const evaluateAudit = (advisories: readonly Advisory[], exceptions: readonly AuditException[], now: Date): AuditReport => {
  const blockingSeverity = advisories.filter(({ severity }) => BLOCKING_SEVERITIES.includes(severity))
  const current = exceptions.filter((exception) => !isExpired(exception, now))

  return {
    allowed: blockingSeverity.filter((advisory) => current.some((exception) => covers(exception, advisory))),
    below: advisories.filter(({ severity }) => !BLOCKING_SEVERITIES.includes(severity)),
    blocking: blockingSeverity.filter((advisory) => !current.some((exception) => covers(exception, advisory))),
    expired: exceptions.filter((exception) => isExpired(exception, now)),
    overlong: exceptions.filter((exception) => isOverlong(exception, now)),
    unused: current.filter((exception) => !blockingSeverity.some((advisory) => covers(exception, advisory))),
  }
}

export const isPassing = ({ blocking, expired, overlong, unused }: AuditReport): boolean =>
  [blocking, expired, overlong, unused].every((list) => list.length === 0)

const describeAdvisory = ({ id, package: name, severity, title, url }: Advisory): string => `${name}: ${severity} ${id}, ${title} (${url})`

const describeException = ({ advisory, expiresOn, package: name, reviewedOn }: AuditException): string =>
  `${name} ${advisory}, reviewed on ${reviewedOn}, expires on ${expiresOn}`

export const reportLines = (report: AuditReport): string[] => [
  ...report.blocking.map(
    (advisory) =>
      `::error::${describeAdvisory(advisory)}. Upgrade the package that pulls it in, or add a reviewed exception to ${AUDIT_EXCEPTIONS_FILE}.`,
  ),
  ...report.expired.map(
    (exception) =>
      `::error::The exception for ${describeException(exception)} has expired. Review it again or remove it from ${AUDIT_EXCEPTIONS_FILE}.`,
  ),
  ...report.overlong.map(
    (exception) =>
      `::error::The exception for ${describeException(exception)} lasts more than ${String(AUDIT_EXCEPTION_MAX_DAYS)} days or is reviewed in the future.`,
  ),
  ...report.unused.map(
    (exception) =>
      `::error::The exception for ${describeException(exception)} matches no reported advisory. Remove it from ${AUDIT_EXCEPTIONS_FILE}.`,
  ),
  ...report.allowed.map(
    (advisory) => `::warning::${describeAdvisory(advisory)}, allowed by a reviewed exception in ${AUDIT_EXCEPTIONS_FILE}.`,
  ),
  ...report.below.map((advisory) => `::notice::${describeAdvisory(advisory)}, below the severity that fails the scan.`),
  isPassing(report) ? AUDIT_VERDICT.PASSED : AUDIT_VERDICT.FAILED,
]

if (import.meta.main) {
  const { status, stdout } = runCommand(process.execPath, AUDIT_ARGUMENTS, { capture: true })

  if (!AUDIT_EXIT_CODES.includes(status)) {
    throw new Error(`bun ${AUDIT_ARGUMENTS.join(" ")} exited with ${String(status)}`)
  }

  const report = evaluateAudit(readAdvisories(stdout), AUDIT_EXCEPTIONS, new Date())

  for (const line of reportLines(report)) {
    console.log(line)
  }

  if (!isPassing(report)) {
    process.exit(FAILURE_EXIT_CODE)
  }
}
