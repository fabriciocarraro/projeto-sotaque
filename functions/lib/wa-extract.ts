import { ESTADOS, SOTAQUES, valoresDe } from "../../src/lib/opcoes";
import { transcreverAudio } from "./asr";

export { transcreverAudio };

type ExtracaoEstado = { uf: string | null };

export async function extrairEstado(texto: string, anthropicKey: string): Promise<string | null> {
  const lista = ESTADOS.map((e) => `${e.valor}=${e.rotulo}`).join(", ");
  const prompt =
    `Extraia a sigla do estado brasileiro (UF) a partir do texto.\n\n` +
    `Texto do usuário: "${texto}"\n\n` +
    `Opções válidas (sigla=nome): ${lista}\n\n` +
    `Responda APENAS com JSON no formato {"uf": "XX"} onde XX é a sigla de 2 letras, ` +
    `ou {"uf": null} se não for possível identificar um único estado.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) return null;

  const data = (await resp.json()) as { content?: Array<{ text?: string }> };
  const raw = data.content?.[0]?.text ?? "";
  const match = raw.match(/\{[^}]+\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as ExtracaoEstado;
    if (!parsed.uf) return null;
    const ufs = valoresDe(ESTADOS);
    return (ufs as readonly string[]).includes(parsed.uf.toUpperCase()) ? parsed.uf.toUpperCase() : null;
  } catch {
    return null;
  }
}

export function normalizarEmail(texto: string): string | null {
  const m = texto.trim().match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
  if (!m) return null;
  const email = m[0].toLowerCase();
  return email.length <= 255 ? email : null;
}

export function normalizarPseudonimo(texto: string): string | null {
  const t = texto.trim();
  if (t.length < 2 || t.length > 60) return null;
  if (!/^[\p{L}\p{N}_\-.\s]+$/u.test(t)) return null;
  return t;
}

export function validarSotaque(id: string): boolean {
  return SOTAQUES.some((s) => s.valor === id);
}
