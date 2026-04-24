import { transcreverAudio } from "../lib/asr";
import { gerarTokenAudio, gerarTokenCallback } from "../lib/tokens";

interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  DEEPGRAM_API_KEY: string;
  APP_SECRET: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY?: string;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function transcreverComGemini(
  buffer: ArrayBuffer,
  mimeType: string,
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; texto?: string; erro?: string; body?: string }> {
  if (!apiKey) return { ok: false, erro: "GEMINI_API_KEY não configurada" };
  if (buffer.byteLength > 20 * 1024 * 1024) {
    return { ok: false, erro: "áudio acima de 20 MB (Gemini inline não aceita)" };
  }
  const base64 = bytesToBase64(new Uint8Array(buffer));
  const body = {
    contents: [
      {
        parts: [
          {
            text:
              "Transcreva integralmente e apenas este áudio em português brasileiro. " +
              "Preserve marcadores de oralidade e contrações coloquiais. " +
              "Não traduza, não resuma, não inclua comentários. " +
              "Responda APENAS com a transcrição pura, sem prefixos ou explicações.",
          },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
  };
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const txt = await r.text();
    if (!r.ok) return { ok: false, erro: `Gemini ${r.status}`, body: txt.slice(0, 500) };
    const data = JSON.parse(txt) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return texto ? { ok: true, texto } : { ok: false, erro: "resposta vazia", body: txt.slice(0, 500) };
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : String(err) };
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);

  // Modo "retry": ?retry=<submission_id>&provider=<deepgram|openai|gemini>
  const retrySid = url.searchParams.get("retry");
  const provider = (url.searchParams.get("provider") ?? "deepgram").toLowerCase();
  if (retrySid) {
    const row = await env.DB.prepare(
      "SELECT audio_key, audio_mimetype, transcricao_status FROM submissions WHERE id = ?",
    )
      .bind(retrySid)
      .first<{ audio_key: string | null; audio_mimetype: string | null; transcricao_status: string | null }>();
    if (!row) return json({ erro: "submission não encontrada", sid: retrySid }, 404);
    if (!row.audio_key) return json({ erro: "submission sem audio_key" }, 400);

    // Providers síncronos (OpenAI, Gemini): baixa do R2 e testa sem sobrescrever D1
    if (provider === "openai" || provider === "gemini") {
      const obj = await env.AUDIO_BUCKET.get(row.audio_key);
      if (!obj) return json({ erro: "áudio não achado no R2" }, 404);
      const buffer = await obj.arrayBuffer();
      const mimetype = row.audio_mimetype ?? obj.httpMetadata?.contentType ?? "audio/webm";

      if (provider === "openai") {
        if (buffer.byteLength > 25 * 1024 * 1024) {
          return json({ erro: "OpenAI aceita até 25 MB", tamanho: buffer.byteLength }, 400);
        }
        const texto = await transcreverAudio(buffer, mimetype, env.OPENAI_API_KEY, {
          model: "gpt-4o-transcribe",
        });
        return json({
          sid: retrySid,
          provider: "openai:gpt-4o-transcribe",
          ok: Boolean(texto),
          transcricao: texto,
          aviso: "esta resposta NÃO atualiza o D1 (apenas comparação)",
        });
      }

      const geminiModel = url.searchParams.get("model") ?? "gemini-2.5-flash";
      const result = await transcreverComGemini(
        buffer,
        mimetype,
        env.GEMINI_API_KEY ?? "",
        geminiModel,
      );
      return json({
        sid: retrySid,
        provider: `gemini:${geminiModel}`,
        ...result,
        aviso: "esta resposta NÃO atualiza o D1 (apenas comparação)",
      });
    }

    const origin = new URL(request.url).origin;
    const audioToken = await gerarTokenAudio(
      row.audio_key,
      Date.now() + 24 * 60 * 60 * 1000,
      env.APP_SECRET,
    );
    const callbackToken = await gerarTokenCallback(retrySid, env.APP_SECRET);
    const audioUrl = `${origin}/api/audio-privado/${audioToken}`;
    const callbackUrl = `${origin}/api/deepgram-callback/${callbackToken}`;

    const deepgramModel = url.searchParams.get("model") ?? "nova-3";
    const dryrun = url.searchParams.get("dryrun") === "1";

    const params = new URLSearchParams({
      model: deepgramModel,
      language: "pt-BR",
      punctuate: "true",
    });
    if (!dryrun) params.set("callback", callbackUrl);

    const r = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    });
    const txt = await r.text();

    if (dryrun) {
      let transcricao: string | null = null;
      try {
        const data = JSON.parse(txt) as {
          results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
        };
        transcricao =
          data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? null;
      } catch {
        // ignore
      }
      return json({
        sid: retrySid,
        provider: `deepgram:${deepgramModel}`,
        ok: r.ok,
        status: r.status,
        transcricao,
        body_amostra: transcricao ? undefined : txt.slice(0, 500),
        aviso: "dry-run: esta resposta NÃO atualiza o D1",
      });
    }

    let requestId: string | null = null;
    try {
      requestId = (JSON.parse(txt) as { request_id?: string }).request_id ?? null;
    } catch {
      // ignore
    }

    if (requestId) {
      await env.DB.prepare(
        `UPDATE submissions SET deepgram_request_id = ?, transcricao_status = 'pendente' WHERE id = ?`,
      )
        .bind(requestId, retrySid)
        .run();
    }

    return json({
      sid: retrySid,
      audio_key: row.audio_key,
      status_anterior: row.transcricao_status,
      deepgram_status: r.status,
      deepgram_ok: r.ok,
      deepgram_body: txt.slice(0, 500),
      request_id: requestId,
      callback_url_gerada: callbackUrl,
    });
  }

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
      model: "nova-3",
      language: "pt-BR",
      punctuate: "true",
      callback: callbackUrl,
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
