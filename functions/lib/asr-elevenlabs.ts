type Options = {
  model?: string;
  language?: string;
  webhookId?: string;
};

export async function enviarParaElevenLabs(
  audioUrl: string,
  apiKey: string,
  opts: Options = {},
): Promise<string | null> {
  if (!apiKey) return null;

  const form = new FormData();
  form.append("cloud_storage_url", audioUrl);
  form.append("model_id", opts.model ?? "scribe_v2");
  form.append("language_code", opts.language ?? "por");
  form.append("webhook", "true");
  if (opts.webhookId) form.append("webhook_id", opts.webhookId);

  try {
    const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error(`ElevenLabs STT ${resp.status}: ${txt}`);
      return null;
    }

    const data = (await resp.json()) as { request_id?: string };
    return data.request_id ?? null;
  } catch (err) {
    console.error("ElevenLabs fetch error:", err);
    return null;
  }
}

// Extrai texto do payload do webhook. Formato aproximado:
//   { type: "...", data: { request_id, transcription: { text, ... } } }
// Tentamos múltiplos caminhos por resiliência.
export function extrairTranscricao(payload: unknown): { text: string | null; requestId: string | null } {
  const p = payload as {
    request_id?: string;
    text?: string;
    transcription?: { text?: string };
    data?: {
      request_id?: string;
      text?: string;
      transcription?: { text?: string };
    };
  };

  const text =
    p.transcription?.text ??
    p.text ??
    p.data?.transcription?.text ??
    p.data?.text ??
    null;

  const requestId = p.request_id ?? p.data?.request_id ?? null;

  return {
    text: typeof text === "string" && text.trim() ? text.trim() : null,
    requestId,
  };
}

// Verifica assinatura HMAC do webhook
// Formato esperado do header ElevenLabs-Signature: "t=<timestamp>,v0=<hex>"
export async function verificarAssinaturaElevenLabs(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts: Record<string, string> = {};
  for (const seg of signatureHeader.split(",")) {
    const eq = seg.indexOf("=");
    if (eq > 0) parts[seg.slice(0, eq).trim()] = seg.slice(eq + 1).trim();
  }

  const t = parts.t;
  const v0 = parts.v0;
  if (!t || !v0) return false;

  const ts = Number.parseInt(t, 10);
  if (!Number.isFinite(ts)) return false;
  // tolerância de 30 minutos pra clock skew e delay de fila
  if (Math.abs(Date.now() / 1000 - ts) > 30 * 60) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hex.length !== v0.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v0.charCodeAt(i);
  return diff === 0;
}
