export const LOCAL_SERVER = {
  HOST: "127.0.0.1",
  PORT: 3000,
} as const

export const TEST_SERVER_PORTS = {
  FIRST: 3020,
  LAST: 3029,
} as const

export const LOCAL_SERVER_ORIGIN = `http://${LOCAL_SERVER.HOST}:${String(LOCAL_SERVER.PORT)}`

const TEST_SERVER_PORT_COUNT = TEST_SERVER_PORTS.LAST - TEST_SERVER_PORTS.FIRST + 1

const loopbackHosts = (port: number): string[] => ["localhost", LOCAL_SERVER.HOST].map((host) => `${host}:${String(port)}`)

export const LOCAL_HOSTS: readonly string[] = loopbackHosts(LOCAL_SERVER.PORT)

export const TEST_HOSTS: readonly string[] = [
  LOCAL_SERVER.PORT,
  ...Array.from({ length: TEST_SERVER_PORT_COUNT }, (_, offset) => TEST_SERVER_PORTS.FIRST + offset),
].flatMap((port) => loopbackHosts(port))
