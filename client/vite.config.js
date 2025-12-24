import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  plugins: [preact()],

  server: {
    ...(isDev && {
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    }),
  },
});
