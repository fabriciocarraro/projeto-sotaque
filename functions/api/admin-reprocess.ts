import { enviarParaElevenLabs } from "../lib/asr-elevenlabs";
import { gerarTokenAudio } from "../lib/tokens";

interface Env {
  DB: D1Database;
  APP_SECRET: string;
  ELEVENLABS_API_KEY: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const sid = url.searchParams.get("sid");
  const secret = url.searchParams.get("secret");

  if (!sid || !secret || secret !== env.APP_SECRET) {
    return json({ erro: "forbidden" }, 403);
  }

  const row = await env.DB.prepare("SELECT audio_key FROM submissions WHERE id = ?")
    .bind(sid)
    .first<{ audio_key: string | null }>();
  if (!row?.audio_key) return json({ erro: "não achou ou sem audio_key", sid }, 404);

  const origin = url.origin;
  const audioToken = await gerarTokenAudio(
    row.audio_key,
    Date.now() + 24 * 60 * 60 * 1000,
    env.APP_SECRET,
  );
  const audioUrl = `${origin}/api/audio-privado/${audioToken}`;

  const requestId = await enviarParaElevenLabs(audioUrl, env.ELEVENLABS_API_KEY);

  if (requestId) {
    await env.DB.prepare(
      `UPDATE submissions
       SET transcricao = NULL,
           transcricao_status = 'pendente',
           asr_request_id = ?,
           transcricao_provider = 'elevenlabs'
       WHERE id = ?`,
    )
      .bind(requestId, sid)
      .run();
    return json({ sid, request_id: requestId, ok: true });
  }

  await env.DB.prepare(`UPDATE submissions SET transcricao_status = 'falhou' WHERE id = ?`)
    .bind(sid)
    .run();
  return json({ sid, ok: false });
};
