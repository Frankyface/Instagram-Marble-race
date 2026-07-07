/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" -> relative asset URLs, so the same build works whether served from
// the domain root or a GitHub Pages project subpath (/<repo>/) without knowing the
// repo name. The app is a single page (no client-side routing), so no 404 fallback needed.
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
