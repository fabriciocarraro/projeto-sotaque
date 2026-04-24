import { extrairTranscricao } from "../../lib/asr-deepgram";
import { validarTokenCallback } from "../../lib/tokens";

interface Env {
  DB: D1Database;
  APP_SECRET: string;
}

async function invalidarCacheEstatisticas(request: Request): Promise<void> {
  try {
    const url = new URL("/api/estatisticas", new URL(request.url).origin).toString();
    await caches.default.delete(new Request(url, { method: "GET" }));
  } catch {
    // best effort
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  const raw = params.token;
  const token = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
  if (!token) return new Response("Not found", { status: 404 });

  const submissionId = await validarTokenCallback(token, env.APP_SECRET);
  if (!submissionId) return new Response("Forbidden", { status: 403 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const transcricao = extrairTranscricao(payload);
  const status = transcricao ? "ok" : "falhou";

  try {
    await env.DB.prepare(
      `UPDATE submissions SET transcricao = ?, transcricao_status = ? WHERE id = ?`,
    )
      .bind(transcricao, status, submissionId)
      .run();
  } catch (err) {
    console.error("Deepgram callback DB update failed:", err);
    return new Response("Server error", { status: 500 });
  }

  // invalidate /api/estatisticas cache (fire and forget)
  invalidarCacheEstatisticas(request).catch(() => {});

  return new Response("OK", { status: 200 });
};
