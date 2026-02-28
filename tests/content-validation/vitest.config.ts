import { defineConfig } from "vitest/config";
import path from "path";

const webRoot = path.resolve(__dirname, "../../apps/web");

export default defineConfig({
  test: {
    environment: "node",
    include: [path.resolve(__dirname, "**/*.test.ts")],
  },
  resolve: {
    alias: {
      "@content": path.resolve(__dirname, "../../content"),
    },
  },
});
