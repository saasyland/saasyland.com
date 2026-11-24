const UNINSTALLED_POLAR_SDK_OPTIONAL_PEERS = [/^@opentelemetry\//u, "ioredis"]

export const polarVitePlugins = () =>
  Promise.resolve([
    {
      config: () => ({ build: { rolldownOptions: { external: UNINSTALLED_POLAR_SDK_OPTIONAL_PEERS } } }),
      name: "saasyland:polar-sdk-optional-peers",
    },
  ])
