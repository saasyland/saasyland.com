import assert from "node:assert/strict"

import { expect, test } from "@playwright/test"
import {
  ACTIVATION_KIND,
  API_ENDPOINT,
  API_ERROR,
  type Api,
  PLATFORM,
  apiRequest,
  deriveMachineId,
  readApiResponse,
} from "@saasyland/stack/api"
import type * as zod from "zod"

import { IP_ADDRESS_HEADER } from "../../src/modules/_core/constants/api"
import { LICENSE_ACTIVATION_LIMITS } from "../../src/modules/license/license.constants"
import { TEST_LICENSE } from "../data/licenses"

interface Endpoint<Input extends zod.ZodType, Output extends zod.ZodType> {
  readonly errors: readonly Api["errorCode"][]
  readonly method: Api["httpMethod"]
  readonly request: Input
  readonly response: Output
  readonly route: string
  readonly statuses: readonly number[]
}

const UNKNOWN_KEY = "SAASYLAND-00000000-0000-4000-8000-000000000000"
const SEEDED_MACHINES = 1
const ACTIVATION = { body: { cliVersion: "0.1.0", kind: ACTIVATION_KIND.MACHINE, label: "e2e-runner", platform: PLATFORM.LINUX } }

const send = async <Input extends zod.ZodType, Output extends zod.ZodType>(
  endpoint: Endpoint<Input, Output>,
  input: zod.input<Input>,
  connection: Api["connection"],
) => {
  const request = apiRequest(endpoint, input, connection)
  request.headers.set(IP_ADDRESS_HEADER, `2001:db8:${crypto.randomUUID().slice(0, 4)}::`)
  return readApiResponse(endpoint, await fetch(request))
}

const license = (machinesUsed: number): Api["license"] => ({
  machineLimit: LICENSE_ACTIVATION_LIMITS[TEST_LICENSE.tier],
  machinesUsed,
  tier: TEST_LICENSE.tier,
})

test.describe("CLI licence API", () => {
  test("activates, reuses, validates and releases a machine for the CLI through the Worker", async ({ baseURL }) => {
    const machine = await deriveMachineId(ACTIVATION_KIND.MACHINE, [crypto.randomUUID()])
    const connection = { credentials: { key: TEST_LICENSE.key, machine }, origin: String(baseURL) }

    expect(await send(API_ENDPOINT.LICENSE, {}, connection)).toMatchObject({
      data: { license: license(SEEDED_MACHINES), machines: [{ current: false, id: TEST_LICENSE.activation.id }] },
    })

    const created = await send(API_ENDPOINT.ACTIVATE, ACTIVATION, connection)
    assert(created.success)
    expect(created.data.license).toStrictEqual(license(SEEDED_MACHINES + 1))
    const { activationId } = created.data
    const activation = { params: { activationId } }

    expect(await send(API_ENDPOINT.ACTIVATE, ACTIVATION, connection)).toMatchObject({ data: { activationId } })
    expect(await send(API_ENDPOINT.VALIDATE, activation, connection)).toMatchObject({ success: true })
    expect(await send(API_ENDPOINT.DEACTIVATE, activation, connection)).toMatchObject({ data: { license: license(SEEDED_MACHINES) } })
    expect(await send(API_ENDPOINT.VALIDATE, activation, connection)).toStrictEqual({
      failure: { code: API_ERROR.ACTIVATION_NOT_FOUND },
      success: false,
    })
  })

  test("refuses a key the site never issued", async ({ baseURL }) => {
    const machine = await deriveMachineId(ACTIVATION_KIND.MACHINE, [crypto.randomUUID()])

    expect(await send(API_ENDPOINT.LICENSE, {}, { credentials: { key: UNKNOWN_KEY, machine }, origin: String(baseURL) })).toStrictEqual({
      failure: { code: API_ERROR.INVALID_LICENSE_KEY },
      success: false,
    })
  })
})
