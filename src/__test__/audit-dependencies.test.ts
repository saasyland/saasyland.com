import { describe, expect, it } from "vite-plus/test"

import { ADVISORY_SEVERITY, AUDIT_EXCEPTION_MAX_DAYS, type AuditException } from "~/src/data/dependency-audit"

import {
  AUDIT_EXCEPTIONS_FILE,
  AUDIT_VERDICT,
  type Advisory,
  type AuditReport,
  evaluateAudit,
  isPassing,
  readAdvisories,
  reportLines,
} from "~/scripts/audit-dependencies"

const NOW = new Date("2026-11-25T12:00:00.000Z")
const ADVISORY_URL = "https://github.com/advisories/"
const HIGH_ID = "GHSA-2222-3333-4444"
const CRITICAL_ID = "GHSA-5555-6666-7777"
const MODERATE_ID = "GHSA-67mh-4wv8-2f99"
const PARSER = "parser"
const SERVER = "server"
const BUNDLER = "esbuild"

const advisory = (id: string, name: string, severity: Advisory["severity"]): Advisory => ({
  id,
  package: name,
  severity,
  title: `${name} advisory`,
  url: `${ADVISORY_URL}${id}`,
})

const HIGH = advisory(HIGH_ID, PARSER, ADVISORY_SEVERITY.HIGH)
const CRITICAL = advisory(CRITICAL_ID, SERVER, ADVISORY_SEVERITY.CRITICAL)
const MODERATE = advisory(MODERATE_ID, BUNDLER, ADVISORY_SEVERITY.MODERATE)

const exception = (overrides: Partial<AuditException>): AuditException => ({
  advisory: HIGH_ID,
  expiresOn: "2027-01-15",
  package: PARSER,
  reason: "Only the build reads untrusted input with it, and no release fixes it yet.",
  reviewedOn: "2026-11-20",
  tracking: "https://github.com/example/parser/issues/1",
  ...overrides,
})

const EMPTY: AuditReport = { allowed: [], below: [], blocking: [], expired: [], overlong: [], unused: [] }

describe("readAdvisories", () => {
  it("reads each advisory bun audit reports under its package, named by the GitHub advisory in its URL", () => {
    const json = JSON.stringify({
      [BUNDLER]: [
        { cvss: {}, id: 1, severity: MODERATE.severity, title: MODERATE.title, url: MODERATE.url, vulnerable_versions: "<=0.24.2" },
      ],
      [PARSER]: [{ severity: HIGH.severity, title: HIGH.title, url: HIGH.url }],
    })

    expect(readAdvisories(json)).toStrictEqual([MODERATE, HIGH])
  })

  it("reads an empty report as no advisories", () => {
    expect(readAdvisories("{}")).toStrictEqual([])
  })

  it("refuses output that is not a report", () => {
    expect(() => readAdvisories("")).toThrow()
    expect(() => readAdvisories(JSON.stringify({ [PARSER]: [{ severity: "severe", title: "", url: HIGH.url }] }))).toThrow()
  })
})

describe("evaluateAudit", () => {
  it("blocks every high and critical advisory without an exception and only notes the others", () => {
    expect(evaluateAudit([HIGH, CRITICAL, MODERATE], [], NOW)).toStrictEqual({ ...EMPTY, below: [MODERATE], blocking: [HIGH, CRITICAL] })
  })

  it("allows an advisory that a current exception names for the same package", () => {
    expect(evaluateAudit([HIGH, CRITICAL], [exception({})], NOW)).toStrictEqual({ ...EMPTY, allowed: [HIGH], blocking: [CRITICAL] })
  })

  it("does not let an exception for one package allow the same advisory in another", () => {
    expect(evaluateAudit([HIGH], [exception({ package: SERVER })], NOW)).toStrictEqual({
      ...EMPTY,
      blocking: [HIGH],
      unused: [exception({ package: SERVER })],
    })
  })

  it("fails an exception from the day it expires and blocks its advisory again", () => {
    const expired = exception({ expiresOn: "2026-11-25" })

    expect(evaluateAudit([HIGH], [expired], NOW)).toStrictEqual({ ...EMPTY, blocking: [HIGH], expired: [expired] })
  })

  it(`fails an exception that lasts more than ${String(AUDIT_EXCEPTION_MAX_DAYS)} days after its review, or that is reviewed in the future`, () => {
    const overlong = exception({ expiresOn: "2027-02-19", reviewedOn: "2026-11-20" })
    const future = exception({ reviewedOn: "2026-11-26" })

    expect(evaluateAudit([HIGH], [overlong, future], NOW)).toStrictEqual({ ...EMPTY, allowed: [HIGH], overlong: [overlong, future] })
  })

  it("fails an exception that no longer matches a blocking advisory, so none outlives its reason", () => {
    const moderate = exception({ advisory: MODERATE_ID, package: BUNDLER })

    expect(evaluateAudit([MODERATE], [moderate], NOW)).toStrictEqual({ ...EMPTY, below: [MODERATE], unused: [moderate] })
  })
})

describe("isPassing and reportLines", () => {
  it("passes with allowed and lower advisories, and still prints each of them", () => {
    const report = { ...EMPTY, allowed: [HIGH], below: [MODERATE] }

    expect(isPassing(report)).toBe(true)
    expect(reportLines(report)).toStrictEqual([
      `::warning::${PARSER}: ${ADVISORY_SEVERITY.HIGH} ${HIGH_ID}, ${HIGH.title} (${HIGH.url}), allowed by a reviewed exception in ${AUDIT_EXCEPTIONS_FILE}.`,
      `::notice::${BUNDLER}: ${ADVISORY_SEVERITY.MODERATE} ${MODERATE_ID}, ${MODERATE.title} (${MODERATE.url}), below the severity that fails the scan.`,
      AUDIT_VERDICT.PASSED,
    ])
  })

  it.each([
    [{ ...EMPTY, blocking: [CRITICAL] }, `::error::${SERVER}: ${ADVISORY_SEVERITY.CRITICAL} ${CRITICAL_ID}`],
    [
      { ...EMPTY, expired: [exception({})] },
      `::error::The exception for ${PARSER} ${HIGH_ID}, reviewed on 2026-11-20, expires on 2027-01-15 has expired.`,
    ],
    [{ ...EMPTY, overlong: [exception({})] }, `lasts more than ${String(AUDIT_EXCEPTION_MAX_DAYS)} days or is reviewed in the future.`],
    [{ ...EMPTY, unused: [exception({})] }, `matches no reported advisory. Remove it from ${AUDIT_EXCEPTIONS_FILE}.`],
  ])("fails and says why for %j", (report, line) => {
    expect(isPassing(report)).toBe(false)
    expect(reportLines(report)[0]).toContain(line)
    expect(reportLines(report).at(-1)).toBe(AUDIT_VERDICT.FAILED)
  })
})
