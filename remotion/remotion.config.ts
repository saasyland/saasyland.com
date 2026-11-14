import path from "node:path"

import { Config } from "@remotion/cli/config"

Config.setRspack(true)
Config.setVideoImageFormat("png")
Config.setOverwriteOutput(true)
Config.overrideBundlerConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      "lucide-react": path.resolve(process.cwd(), "node_modules/lucide-react"),
      "~": path.resolve(process.cwd(), ".."),
    },
  },
}))
