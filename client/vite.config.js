import preact from "@preact/preset-vite";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      "@router": fileURLToPath(
        new URL("./src/routing/router.jsx", import.meta.url)
      ),
      "@router/": fileURLToPath(new URL("./src/routing/", import.meta.url)),
    },
  },
  server: {
    ...(isDev && {
      proxy: {
        //To Do
        // "/api": {
        //   target: "http://localhost:3000",
        //   changeOrigin: true,
        // },
      },
    }),
  },
});
