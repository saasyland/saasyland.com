import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { gunzipSync } from "node:zlib"
import assert from "node:assert/strict"

import { type APIRequestContext, test as base, expect } from "@playwright/test"
import { STACK_DEFAULTS } from "@saasyland/stack"
import {
  ACTIVATION_KIND,
  API_ENDPOINT,
  API_ERROR,
  API_HEADER,
  type Api,
  CI_REPOSITORY_VARIABLE,
  RATE_LIMIT,
  apiRequest,
  ciRepository,
  deriveMachineId,
  readApiResponse,
} from "@saasyland/stack/api"

import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { bundleObjectKey } from "../../src/modules/license/license.bundles"
import {
  BUNDLE_CONTENT_TYPE,
  LICENSE_ACTIVATION_LIMITS,
  LICENSE_API_RETRY_AFTER_SECONDS,
  LICENSE_TIER,
} from "../../src/modules/license/license.constants"
import { TEST_BUNDLE, TEST_CLI_LICENSES } from "../data/licenses"
import { ownAddress, signUpBuyer } from "../fixtures/buyer"
import { CLI_ACTIVATION, fromAddress, machineConnection, sendToApi } from "../fixtures/cli-api"
import { buyLicense, cutOffPolar } from "../fixtures/license"
import { EVERY_STACK_ANSWER } from "../fixtures/stack-answers"

type CliTestLicense = (typeof TEST_CLI_LICENSES)[number]

interface CliMachine {
  readonly connection: Api["connection"]
  readonly license: CliTestLicense
}

const UNKNOWN_KEY = "SAASYLAND-00000000-0000-4000-8000-000000000000"
const SEEDED_MACHINES = 1
const UNRELEASED_VERSION = "9.9.9"
const ACTIVATION = CLI_ACTIVATION

const RETRY_AFTER_SECONDS = /^[1-9]\d*$/u

const freshLicenceKey = async (request: APIRequestContext, baseURL: string | undefined): Promise<string> => {
  const { userId } = await signUpBuyer(baseURL)
  const { key } = await buyLicense(request, { tier: LICENSE_TIER.CORE, userId })
  return key
}

const repeat = async <Result>(times: number, send: () => Promise<Result>): Promise<Result[]> =>
  Promise.all(Array.from({ length: times }, async () => send()))

const summary = ({ tier }: CliTestLicense, machinesUsed: number): Api["license"] => ({
  machineLimit: LICENSE_ACTIVATION_LIMITS[tier],
  machinesUsed,
  tier,
})

const test = base.extend<{ cliMachine: CliMachine }>({
  cliMachine: async ({ baseURL }, runWith, { parallelIndex }) => {
    const license = TEST_CLI_LICENSES[parallelIndex]
    assert(license, `e2e/data/licenses.ts seeds no CLI licence for parallel worker ${String(parallelIndex)}`)
    const machine = await deriveMachineId(ACTIVATION_KIND.MACHINE, [crypto.randomUUID()])
    const connection = { credentials: { key: license.key, machine }, origin: String(baseURL) }

    await runWith({ connection, license })

    const read = await sendToApi(API_ENDPOINT.LICENSE, {}, connection)
    assert(read.success)
    const held = read.data.machines.find(({ current }) => current)
    if (held !== undefined) {
      expect(await sendToApi(API_ENDPOINT.DEACTIVATE, { params: { activationId: held.id } }, connection)).toMatchObject({ success: true })
    }
  },
})

test.describe("CLI licence API", () => {
  test("activates, reuses, validates and releases a machine for the CLI through the Worker", async ({ cliMachine }) => {
    const { connection, license } = cliMachine

    expect(await sendToApi(API_ENDPOINT.LICENSE, {}, connection)).toMatchObject({
      data: { license: summary(license, SEEDED_MACHINES), machines: [{ current: false, id: license.activation.id }] },
    })

    const created = await sendToApi(API_ENDPOINT.ACTIVATE, ACTIVATION, connection)
    assert(created.success)
    expect(created.data.license).toStrictEqual(summary(license, SEEDED_MACHINES + 1))
    const { activationId } = created.data
    const activation = { params: { activationId } }

    expect(await sendToApi(API_ENDPOINT.ACTIVATE, ACTIVATION, connection)).toMatchObject({ data: { activationId } })
    expect(await sendToApi(API_ENDPOINT.VALIDATE, activation, connection)).toMatchObject({ success: true })
    expect(await sendToApi(API_ENDPOINT.DEACTIVATE, activation, connection)).toMatchObject({
      data: { license: summary(license, SEEDED_MACHINES) },
    })
    expect(await sendToApi(API_ENDPOINT.VALIDATE, activation, connection)).toStrictEqual({
      failure: { code: API_ERROR.ACTIVATION_NOT_FOUND },
      success: false,
    })
  })

  test("signs a URL to a release's bundle that the Worker serves with the digest and size it promised", async ({ baseURL, cliMachine }) => {
    const { connection } = cliMachine
    const archive = readFileSync(join(TEST_BUNDLE.fixture, bundleObjectKey(TEST_BUNDLE.version)))
    const created = await sendToApi(API_ENDPOINT.ACTIVATE, ACTIVATION, connection)
    assert(created.success)
    const params = { activationId: created.data.activationId }

    const bundle = await sendToApi(API_ENDPOINT.BUNDLE, { body: { answers: STACK_DEFAULTS, version: TEST_BUNDLE.version }, params }, connection)
    const unreleased = await sendToApi(API_ENDPOINT.BUNDLE, { body: { answers: STACK_DEFAULTS, version: UNRELEASED_VERSION }, params }, connection)

    assert(bundle.success)
    expect(bundle.data).toMatchObject({ sha256: createHash("sha256").update(gunzipSync(archive)).digest("hex"), size: archive.byteLength })
    expect(unreleased).toStrictEqual({ failure: { code: API_ERROR.VERSION_NOT_FOUND, version: UNRELEASED_VERSION }, success: false })
    const signed = new URL(bundle.data.url)
    expect(signed.protocol).toBe("https:")
    const download = await fetch(new URL(signed.pathname, baseURL))
    expect(download.status).toBe(HTTP_STATUS.OK)
    expect(download.headers.get("content-type")).toBe(BUNDLE_CONTENT_TYPE)
    expect(Buffer.from(await download.arrayBuffer()).equals(archive)).toBe(true)
    const tampered = await fetch(new URL(signed.pathname.replace(TEST_BUNDLE.version, "0.0.1"), baseURL))
    expect(tampered.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("refuses a key the site never issued", async ({ baseURL }) => {
    const machine = await deriveMachineId(ACTIVATION_KIND.MACHINE, [crypto.randomUUID()])

    expect(await sendToApi(API_ENDPOINT.LICENSE, {}, { credentials: { key: UNKNOWN_KEY, machine }, origin: String(baseURL) })).toStrictEqual({
      failure: { code: API_ERROR.INVALID_LICENSE_KEY },
      success: false,
    })
  })

  test("refuses the machine after the tier's limit with activationLimitReached and the machines that hold the slots", async ({
    baseURL,
    request,
  }) => {
    const key = await freshLicenceKey(request, baseURL)
    const limit = LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE]
    for (let used = 1; used <= limit; used += 1) {
      expect(await sendToApi(API_ENDPOINT.ACTIVATE, ACTIVATION, await machineConnection(key, baseURL))).toMatchObject({
        data: { license: { machinesUsed: used } },
        success: true,
      })
    }

    const refused = await sendToApi(API_ENDPOINT.ACTIVATE, ACTIVATION, await machineConnection(key, baseURL))

    expect(refused).toMatchObject({
      failure: { code: API_ERROR.ACTIVATION_LIMIT_REACHED, license: { machineLimit: limit, machinesUsed: limit, tier: LICENSE_TIER.CORE } },
      success: false,
    })
    assert(!refused.success && refused.failure.code === API_ERROR.ACTIVATION_LIMIT_REACHED)
    expect(refused.failure.machines).toHaveLength(limit)
  })

  test("keeps one slot for a CI machine named by its repository on every run, and gives another repository its own", async ({
    baseURL,
    request,
  }) => {
    const key = await freshLicenceKey(request, baseURL)
    const ciRun = async (name: string) => {
      const repository = ciRepository({ [CI_REPOSITORY_VARIABLE]: name })
      assert(repository !== undefined)
      const connection = { credentials: { key, machine: await deriveMachineId(ACTIVATION_KIND.CI, repository.identity) }, origin: String(baseURL) }
      return sendToApi(API_ENDPOINT.ACTIVATE, { body: { ...ACTIVATION.body, kind: ACTIVATION_KIND.CI, label: repository.name } }, connection)
    }

    const first = await ciRun("acme/storefront")
    const rerun = await ciRun("acme/storefront")
    const other = await ciRun("acme/dashboard")

    assert(first.success && rerun.success && other.success)
    expect(first.data.license.machinesUsed).toBe(1)
    expect(rerun.data).toStrictEqual(first.data)
    expect(other.data.activationId).not.toBe(first.data.activationId)
    expect(other.data.license.machinesUsed).toBe(2)
  })

  test("refuses requests over the limit for one address or one key with rateLimited and a Retry-After", async ({ baseURL, request }) => {
    const address = ownAddress()
    const unknown = { credentials: { key: `SAASYLAND-${crypto.randomUUID()}`, machine: await deriveMachineId(ACTIVATION_KIND.MACHINE, [crypto.randomUUID()]) }, origin: String(baseURL) }
    const fromOneAddress = async () => fetch(fromAddress(apiRequest(API_ENDPOINT.LICENSE, {}, unknown), address))

    const allowed = await repeat(RATE_LIMIT.REQUESTS_PER_ADDRESS, async () => readApiResponse(API_ENDPOINT.LICENSE, await fromOneAddress()))
    const overAddress = await fromOneAddress()

    expect(allowed).toStrictEqual(Array.from(allowed, () => ({ failure: { code: API_ERROR.INVALID_LICENSE_KEY }, success: false })))
    expect(overAddress.headers.get(API_HEADER.RETRY_AFTER)).toMatch(RETRY_AFTER_SECONDS)
    expect(await readApiResponse(API_ENDPOINT.LICENSE, overAddress)).toMatchObject({ failure: { code: API_ERROR.RATE_LIMITED }, success: false })

    const connection = await machineConnection(await freshLicenceKey(request, baseURL), baseURL)
    const fromAnyAddress = async () => fetch(fromAddress(apiRequest(API_ENDPOINT.LICENSE, {}, connection)))

    const answered = await repeat(RATE_LIMIT.REQUESTS_PER_LICENSE_KEY, async () => readApiResponse(API_ENDPOINT.LICENSE, await fromAnyAddress()))
    const overKey = await fromAnyAddress()

    expect(answered.every(({ success }) => success)).toBe(true)
    expect(overKey.headers.get(API_HEADER.RETRY_AFTER)).toMatch(RETRY_AFTER_SECONDS)
    expect(await readApiResponse(API_ENDPOINT.LICENSE, overKey)).toMatchObject({ failure: { code: API_ERROR.RATE_LIMITED }, success: false })
  })

  test("refuses a malformed request with invalidRequest", async ({ cliMachine }) => {
    const valid = apiRequest(API_ENDPOINT.ACTIVATE, ACTIVATION, cliMachine.connection)
    const malformed = [JSON.stringify({ ...ACTIVATION.body, kind: "laptop" }), "{"]

    for (const body of malformed) {
      expect(await readApiResponse(API_ENDPOINT.ACTIVATE, await fetch(fromAddress(new Request(valid, { body }))))).toMatchObject({
        failure: { code: API_ERROR.INVALID_REQUEST },
        success: false,
      })
    }
  })

  test("answers serviceUnavailable with a Retry-After when Polar cannot be reached", async ({ baseURL, request }) => {
    const key = await freshLicenceKey(request, baseURL)
    await cutOffPolar(request, key)

    const response = await fetch(fromAddress(apiRequest(API_ENDPOINT.LICENSE, {}, await machineConnection(key, baseURL))))

    expect(response.headers.get(API_HEADER.RETRY_AFTER)).toBe(String(LICENSE_API_RETRY_AFTER_SECONDS))
    expect(await readApiResponse(API_ENDPOINT.LICENSE, response)).toStrictEqual({
      failure: { code: API_ERROR.SERVICE_UNAVAILABLE, retryAfterSeconds: LICENSE_API_RETRY_AFTER_SECONDS },
      success: false,
    })
  })

  test("signs a bundle for every answer the published CLI can send, not only the defaults", async ({ baseURL, request }) => {
    const connection = await machineConnection(await freshLicenceKey(request, baseURL), baseURL)
    const activated = await sendToApi(API_ENDPOINT.ACTIVATE, ACTIVATION, connection)
    assert(activated.success)
    const params = { activationId: activated.data.activationId }

    const bundles = await Promise.all(
      EVERY_STACK_ANSWER.map(async (answers) => ({
        answers,
        bundle: await sendToApi(API_ENDPOINT.BUNDLE, { body: { answers, version: TEST_BUNDLE.version }, params }, connection),
      })),
    )

    expect(bundles.filter(({ bundle }) => !bundle.success)).toEqual([])
  })
})
