import assert from "node:assert/strict"

import { type TestInfo, expect, test } from "@playwright/test"
import { API_ENDPOINT } from "@saasyland/stack/api"
import { CREDENTIALS_STORE, EXIT_CODE } from "@saasyland/stack/cli"

import { CLI_COMMAND } from "../../src/data/cli"
import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER } from "../../src/modules/license/license.constants"
import { signUpBuyer } from "../fixtures/buyer"
import { CLI_ACTIVATION, machineConnection, sendToApi } from "../fixtures/cli-api"
import { buyLicense } from "../fixtures/license"
import { CLI_ERROR, CLI_RESULT, type Machine, createMachine, runCli, storedCredentials } from "../journey/cli"

const TIER = LICENSE_TIER.CORE
const LIMIT = LICENSE_ACTIVATION_LIMITS[TIER]
const LABEL = "Published CLI workstation"

const machine = async (testInfo: TestInfo, baseURL: string | undefined, name: string): Promise<Machine> =>
  createMachine({ apiUrl: String(baseURL), home: testInfo.outputPath("machines", name), npmCache: testInfo.outputPath("npm-cache") })

test.describe("published CLI", () => {
  test.slow()

  test("activates with the key and writes its credentials, whoami shows the machine, and deactivate frees the slot and removes them", async ({
    baseURL,
    request,
  }, testInfo) => {
    const { userId } = await signUpBuyer(baseURL)
    const { key } = await buyLicense(request, { tier: TIER, userId })
    const workstation = await machine(testInfo, baseURL, "workstation")

    const activated = await runCli(workstation, [CLI_COMMAND.ACTIVATE, key, "--label", LABEL])

    expect(activated).toMatchObject({
      exitCode: EXIT_CODE.SUCCESS,
      output: { license: { machineLimit: LIMIT, machinesUsed: 1, tier: TIER }, result: CLI_RESULT.ACTIVATED },
    })
    const stored = await storedCredentials(workstation)
    assert(stored !== undefined)
    expect(stored).toMatchObject({ credentials: { key }, mode: CREDENTIALS_STORE.FILE_MODE })
    const { activationId } = stored.credentials
    expect(await runCli(workstation, [CLI_COMMAND.WHOAMI])).toMatchObject({
      exitCode: EXIT_CODE.SUCCESS,
      output: { activationId, machines: [{ current: true, id: activationId, label: LABEL }], result: CLI_RESULT.LICENSE_ACTIVE },
    })

    expect(await runCli(workstation, [CLI_COMMAND.DEACTIVATE])).toMatchObject({
      exitCode: EXIT_CODE.SUCCESS,
      output: { activationId, license: { machinesUsed: 0 }, result: CLI_RESULT.DEACTIVATED },
    })
    expect(await storedCredentials(workstation)).toBeUndefined()
    expect(await runCli(workstation, [CLI_COMMAND.WHOAMI])).toMatchObject({
      exitCode: EXIT_CODE.NO_PERMISSION,
      output: { reason: CLI_ERROR.NOT_ACTIVATED },
    })
  })

  test("is refused the machine after the tier's limit with activationLimitReached and stores no credentials", async ({
    baseURL,
    request,
  }, testInfo) => {
    const { userId } = await signUpBuyer(baseURL)
    const { key } = await buyLicense(request, { tier: TIER, userId })
    for (let used = 1; used <= LIMIT; used += 1) {
      expect(await sendToApi(API_ENDPOINT.ACTIVATE, CLI_ACTIVATION, await machineConnection(key, baseURL))).toMatchObject({ success: true })
    }
    const overflow = await machine(testInfo, baseURL, "overflow")

    expect(await runCli(overflow, [CLI_COMMAND.ACTIVATE, key, "--label", LABEL])).toMatchObject({
      exitCode: EXIT_CODE.NO_PERMISSION,
      output: {
        api: { code: CLI_ERROR.ACTIVATION_LIMIT_REACHED, license: { machineLimit: LIMIT, machinesUsed: LIMIT, tier: TIER } },
        reason: CLI_ERROR.ACTIVATION_LIMIT_REACHED,
      },
    })
    expect(await storedCredentials(overflow)).toBeUndefined()
  })

  test("loses the key of a refunded licence, refused with licenseRefunded, and removes its credentials", async ({ baseURL, request }, testInfo) => {
    const { userId } = await signUpBuyer(baseURL)
    const { key, refund } = await buyLicense(request, { tier: TIER, userId })
    const workstation = await machine(testInfo, baseURL, "workstation")
    expect(await runCli(workstation, [CLI_COMMAND.ACTIVATE, key, "--label", LABEL])).toMatchObject({ exitCode: EXIT_CODE.SUCCESS })
    expect(await storedCredentials(workstation)).toBeDefined()

    await refund()

    expect(await runCli(workstation, [CLI_COMMAND.WHOAMI])).toMatchObject({
      exitCode: EXIT_CODE.NO_PERMISSION,
      output: { reason: CLI_ERROR.LICENSE_REFUNDED },
    })
    expect(await storedCredentials(workstation)).toBeUndefined()
  })
})
