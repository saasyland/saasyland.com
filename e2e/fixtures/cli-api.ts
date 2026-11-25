import { ACTIVATION_KIND, type Api, PLATFORM, apiRequest, deriveMachineId, readApiResponse } from "@saasyland/stack/api"
import type * as zod from "zod"

import { IP_ADDRESS_HEADER } from "../../src/modules/_core/constants/api"
import { ownAddress } from "./buyer"

interface Endpoint<Input extends zod.ZodType, Output extends zod.ZodType> {
  readonly errors: readonly Api["errorCode"][]
  readonly method: Api["httpMethod"]
  readonly request: Input
  readonly response: Output
  readonly route: string
  readonly statuses: readonly number[]
}

export const CLI_ACTIVATION = { body: { cliVersion: "0.1.0", kind: ACTIVATION_KIND.MACHINE, label: "e2e-runner", platform: PLATFORM.LINUX } }

export const fromAddress = (request: Request, address: string = ownAddress()): Request => {
  request.headers.set(IP_ADDRESS_HEADER, address)
  return request
}

export const sendToApi = async <Input extends zod.ZodType, Output extends zod.ZodType>(
  endpoint: Endpoint<Input, Output>,
  input: zod.input<Input>,
  connection: Api["connection"],
) => readApiResponse(endpoint, await fetch(fromAddress(apiRequest(endpoint, input, connection))))

export const machineConnection = async (key: string, baseURL: string | undefined): Promise<Api["connection"]> => ({
  credentials: { key, machine: await deriveMachineId(ACTIVATION_KIND.MACHINE, [crypto.randomUUID()]) },
  origin: String(baseURL),
})
