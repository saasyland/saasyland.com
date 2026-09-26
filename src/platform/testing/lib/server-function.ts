import { getRequest } from "@tanstack/react-start/server"
import { runWithStartContext } from "@tanstack/start-storage-context"

type ServerFunction = ((options: unknown) => Promise<unknown>) & { __executeServer: (options: unknown) => Promise<unknown> }

const BUILDER_METHODS = new Set<string | symbol>(["inputValidator", "middleware", "validator"])

const context = () => ({
  contextAfterGlobalMiddlewares: {},
  executedRequestMiddlewares: new Set(),
  getRouter: () => {
    throw new Error("This test exercises a server function, not route rendering")
  },
  handlerType: "serverFn" as const,
  request: getRequest(),
  startOptions: {},
})

const isServerFunction = (value: unknown): value is ServerFunction =>
  typeof value === "function" && "__executeServer" in value && typeof value.__executeServer === "function"

export const withTestRpc = (builder: unknown): unknown => {
  if (typeof builder !== "function") {
    return builder
  }
  return new Proxy(builder, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver)
      if (typeof value !== "function") {
        return value
      }
      if (property === "handler") {
        return (handler: unknown) => {
          const compiled: { serverFunction?: ServerFunction } = {}
          const serverFunction: unknown = Reflect.apply(value, target, [
            (options: unknown) => runWithStartContext(context(), () => compiled.serverFunction?.__executeServer(options)),
            handler,
          ])
          if (!isServerFunction(serverFunction)) {
            throw new TypeError("createServerFn().handler() did not return a server function")
          }
          compiled.serverFunction = serverFunction
          return Object.assign((options: unknown) => runWithStartContext(context(), () => serverFunction(options)), serverFunction)
        }
      }
      if (BUILDER_METHODS.has(property)) {
        return (...args: unknown[]) => withTestRpc(Reflect.apply(value, target, args))
      }
      return value
    },
  })
}
