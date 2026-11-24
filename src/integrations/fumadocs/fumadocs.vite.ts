export const fumadocsVitePlugins = async () => {
  const { fumadocsMdx } = await import("fumadocs-mdx/vite")

  return [
    fumadocsMdx({ configPath: "./src/integrations/fumadocs/fumadocs.config.ts" }),
    { config: () => ({ resolve: { noExternal: ["fumadocs-core", "@fumadocs/base-ui"] } }), name: "saasyland:fumadocs-bundled" },
  ] as const
}
