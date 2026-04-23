import { z } from "zod";
import {
  AMBIENTES,
  DISPOSITIVOS,
  ESTADOS,
  FAIXAS_ETARIAS,
  GENEROS,
  MICROFONES,
  REGIOES,
  SOTAQUES,
  valoresDe,
} from "./opcoes";

const vazioParaUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

export const consentimentoSchema = z.object({
  checkbox_1: z.literal(true, { errorMap: () => ({ message: "Este consentimento é obrigatório." }) }),
  checkbox_2: z.literal(true, { errorMap: () => ({ message: "Este consentimento é obrigatório." }) }),
  checkbox_3: z.literal(true, { errorMap: () => ({ message: "Este consentimento é obrigatório." }) }),
  checkbox_4: z.literal(true, { errorMap: () => ({ message: "Este consentimento é obrigatório." }) }),
  checkbox_5: z.literal(true, { errorMap: () => ({ message: "Este consentimento é obrigatório." }) }),
  checkbox_6: z.literal(true, { errorMap: () => ({ message: "Este consentimento é obrigatório." }) }),
  checkbox_7: z.literal(true, { errorMap: () => ({ message: "Este consentimento é obrigatório." }) }),
});

export const submissaoSchema = z.object({
  pseudonimo: z
    .string()
    .trim()
    .min(2, "Pseudônimo muito curto.")
    .max(60, "Pseudônimo muito longo.")
    .regex(/^[\p{L}\p{N}_\-.\s]+$/u, "Use apenas letras, números, espaço, hífen, ponto ou underline."),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(255),

  sotaque_declarado: z.enum(valoresDe(SOTAQUES)),
  regiao_socializacao: z.enum(valoresDe(REGIOES)),
  estado_principal: z.enum(valoresDe(ESTADOS)),
  cidade_microrregiao: z
    .preprocess(vazioParaUndefined, z.string().trim().max(120).optional()),

  faixa_etaria: z.enum(valoresDe(FAIXAS_ETARIAS)),
  genero: z.preprocess(vazioParaUndefined, z.enum(valoresDe(GENEROS)).optional()),

  tipo_dispositivo: z.preprocess(vazioParaUndefined, z.enum(valoresDe(DISPOSITIVOS)).optional()),
  tipo_microfone: z.preprocess(vazioParaUndefined, z.enum(valoresDe(MICROFONES)).optional()),
  ambiente_gravacao: z.preprocess(vazioParaUndefined, z.enum(valoresDe(AMBIENTES)).optional()),
  autoavaliacao_qualidade: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).max(5).optional(),
  ),

  consentimento: consentimentoSchema,
  turnstileToken: z.string().min(1, "Verificação anti-spam ausente."),
});

export type SubmissaoInput = z.infer<typeof submissaoSchema>;
