import { existsSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import type { Plugin } from "vite-plus"

const DEPLOYED_WORKER_BUILD = "DEPLOYED_WORKER_BUILD"

const PRERENDERED_ONLY_MESSAGES = ["pages.landing", "pages.legal.*", "pages.premium"].map((namespace) => `**/messages/*/${namespace}.json`)

const isDeployedWorkerBuild = (): boolean => process.env[DEPLOYED_WORKER_BUILD] === "true"

export const rehypeOmitRenderedContent = () => (tree: { children: { type: string }[] }) => {
  if (isDeployedWorkerBuild()) {
    tree.children = tree.children.filter((node) => node.type === "mdxjsEsm")
  }
}

export const deployedWorker = (): Plugin => {
  let clientOutDir = ""

  return {
    buildApp: {
      async handler(builder) {
        const { client, ssr } = builder.environments

        if (client === undefined || ssr === undefined) {
          throw new Error("The deployed Worker needs the client and ssr environments")
        }

        clientOutDir = resolve(builder.config.root, client.config.build.outDir)

        if (!existsSync(resolve(clientOutDir, "index.html"))) {
          throw new Error("The deployed Worker must be built after prerendering")
        }

        process.env[DEPLOYED_WORKER_BUILD] = "true"
        rmSync(resolve(builder.config.root, ssr.config.build.outDir), { force: true, recursive: true })
        await builder.build(ssr)
      },
      order: "post",
    },
    enforce: "post",
    generateBundle(_options, bundle) {
      if (!isDeployedWorkerBuild()) {
        return
      }

      for (const { fileName, type } of Object.values(bundle)) {
        if (type === "asset" && existsSync(resolve(clientOutDir, fileName))) {
          delete bundle[fileName]
        }
      }
    },
    name: "saasyland:deployed-worker",
    transform: {
      filter: { id: PRERENDERED_ONLY_MESSAGES },
      handler: (code) => (isDeployedWorkerBuild() ? "{}" : code),
      order: "pre",
    },
  }
}
