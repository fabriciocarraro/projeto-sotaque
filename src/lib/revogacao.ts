import { z } from "zod";

const vazioParaUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const revogacaoSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(255),
  submission_id: z.preprocess(vazioParaUndefined, z.string().uuid("ID de submissão inválido.").optional()),
  motivo: z.preprocess(vazioParaUndefined, z.string().trim().max(2000).optional()),
  turnstileToken: z.string().min(1, "Verificação anti-spam ausente."),
});

export type RevogacaoInput = z.infer<typeof revogacaoSchema>;
