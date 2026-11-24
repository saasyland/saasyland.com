import type { EnvironmentOptions } from "vite-plus"

const CLIENT_ENVIRONMENT = "client"
const ZOD_CONFIG = /[\\/]src[\\/]integrations[\\/]zod[\\/]zod\.config\.ts$/u

export const zodConfigChunk = (environment: string): EnvironmentOptions => {
  if (environment !== CLIENT_ENVIRONMENT) {
    return {}
  }

  return { build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: "zod", test: ZOD_CONFIG }] } } } } }
}

export const zodVitePlugins = () => Promise.resolve([{ configEnvironment: zodConfigChunk, name: "saasyland:zod-config-chunk" }])
