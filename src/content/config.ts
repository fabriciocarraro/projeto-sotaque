import { defineCollection, z } from "astro:content";

const termo = defineCollection({
  type: "content",
  schema: z.object({
    versao: z.string(),
    titulo: z.string(),
    subtitulo: z.string(),
  }),
});

export const collections = { termo };
