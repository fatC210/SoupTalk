import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, mergeConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function viteEnvDefines(mode: string) {
  return Object.fromEntries(
    Object.entries(loadEnv(mode, process.cwd(), "VITE_")).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );
}

function withWatchDebounce(config: UserConfig): UserConfig {
  const watch = config.server?.watch ?? {};
  const awaitWriteFinish = watch.awaitWriteFinish;
  const awaitWriteFinishOptions =
    awaitWriteFinish && typeof awaitWriteFinish === "object" && !Array.isArray(awaitWriteFinish)
      ? awaitWriteFinish
      : {};

  return mergeConfig(config, {
    server: {
      watch: {
        ...watch,
        awaitWriteFinish: {
          ...awaitWriteFinishOptions,
          stabilityThreshold: 1_000,
          pollInterval: 100,
        },
      },
    },
  });
}

export default defineConfig(({ command, mode }) => {
  const config: UserConfig = {
    define: viteEnvDefines(mode),
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      command === "build" ? cloudflare({ viteEnvironment: { name: "ssr" } }) : null,
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: { entry: "server" },
      }),
      react(),
    ],
  };

  return withWatchDebounce(config);
});
