import { extrairTranscricao, verificarAssinaturaElevenLabs } from "../lib/asr-elevenlabs";

interface Env {
  DB: D1Database;
  ELEVENLABS_WEBHOOK_SECRET: string;
}

async function invalidarCacheEstatisticas(request: Request): Promise<void> {
  try {
    const url = new URL("/api/estatisticas", new URL(request.url).origin).toString();
    await caches.default.delete(new Request(url, { method: "GET" }));
  } catch {
    // best effort
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rawBody = await request.text();
  const sig =
    request.headers.get("ElevenLabs-Signature") ??
    request.headers.get("elevenlabs-signature") ??
    request.headers.get("x-elevenlabs-signature");

  if (!(await verificarAssinaturaElevenLabs(rawBody, sig, env.ELEVENLABS_WEBHOOK_SECRET))) {
    console.warn("ElevenLabs callback: assinatura inválida", { sig });
    return new Response("Forbidden", { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { text, requestId } = extrairTranscricao(payload);
  if (!requestId) {
    console.error("ElevenLabs callback sem request_id:", rawBody.slice(0, 500));
    return new Response("Missing request_id", { status: 400 });
  }

  const status = text ? "ok" : "falhou";

  try {
    const { meta } = await env.DB.prepare(
      `UPDATE submissions
       SET transcricao = ?, transcricao_status = ?
       WHERE deepgram_request_id = ?`,
    )
      .bind(text, status, requestId)
      .run();

    if (!meta.changes) {
      console.warn("ElevenLabs callback: nenhuma submissão casou com request_id", requestId);
    }
  } catch (err) {
    console.error("ElevenLabs callback DB update falhou:", err);
    return new Response("Server error", { status: 500 });
  }

  invalidarCacheEstatisticas(request).catch(() => {});

  return new Response("OK", { status: 200 });
};
