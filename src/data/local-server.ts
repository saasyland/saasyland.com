export const LOCAL_SERVER = {
  HOST: "127.0.0.1",
  PORT: 3000,
} as const

export const LOCAL_SERVER_ORIGIN = `http://${LOCAL_SERVER.HOST}:${String(LOCAL_SERVER.PORT)}`
