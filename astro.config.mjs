import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://sotaque.ia.br",
  integrations: [react(), tailwind({ applyBaseStyles: true })],
  output: "static",
  build: {
    format: "directory",
  },
});
