import { gerarTokenAudio, gerarTokenCallback } from "../lib/tokens";

interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  DEEPGRAM_API_KEY: string;
  APP_SECRET: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const diag: Record<string, unknown> = {};

  // 1. Existência das envs
  diag.envs = {
    DEEPGRAM_API_KEY_presente: Boolean(env.DEEPGRAM_API_KEY),
    DEEPGRAM_API_KEY_tamanho: env.DEEPGRAM_API_KEY?.length ?? 0,
    DEEPGRAM_API_KEY_prefixo: env.DEEPGRAM_API_KEY
      ? env.DEEPGRAM_API_KEY.slice(0, 4) + "…"
      : null,
    APP_SECRET_presente: Boolean(env.APP_SECRET),
    APP_SECRET_tamanho: env.APP_SECRET?.length ?? 0,
  };

  // 2. Testar auth no Deepgram (lista de projetos)
  try {
    const r = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}` },
    });
    const txt = await r.text();
    diag.deepgram_auth = {
      status: r.status,
      ok: r.ok,
      body_amostra: txt.slice(0, 300),
    };
  } catch (err) {
    diag.deepgram_auth = { erro: err instanceof Error ? err.message : String(err) };
  }

  // 3. Tentar um dispatch de verdade com uma URL pública de áudio de teste
  // (usa sample público do Deepgram para eliminar variável da nossa R2/token)
  try {
    const origin = new URL(request.url).origin;
    const callbackToken = await gerarTokenCallback("debug-test-id", env.APP_SECRET);
    const callbackUrl = `${origin}/api/deepgram-callback/${callbackToken}`;

    const params = new URLSearchParams({
      model: "nova-2",
      language: "pt-BR",
      smart_format: "true",
      punctuate: "true",
      callback: callbackUrl,
      callback_method: "POST",
    });

    const r = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://dpgr.am/spacewalk.wav",
      }),
    });
    const txt = await r.text();
    diag.deepgram_dispatch_teste = {
      status: r.status,
      ok: r.ok,
      body_amostra: txt.slice(0, 500),
      callback_url_gerada: callbackUrl,
    };
  } catch (err) {
    diag.deepgram_dispatch_teste = { erro: err instanceof Error ? err.message : String(err) };
  }

  // 4. Verificar token de audio-privado
  try {
    const token = await gerarTokenAudio(
      "2026-04-24/test.webm",
      Date.now() + 60_000,
      env.APP_SECRET,
    );
    diag.audio_privado_token_exemplo = {
      tamanho: token.length,
      partes: token.split(".").length,
      amostra: token.slice(0, 40) + "…",
    };
  } catch (err) {
    diag.audio_privado_token_exemplo = { erro: err instanceof Error ? err.message : String(err) };
  }

  return json(diag);
};
