import { submissaoSchema } from "../../src/lib/schema";
import {
  AUDIO_TAMANHO_MAX,
  EXTENSOES_PERMITIDAS,
  MIMETYPES_PERMITIDOS,
} from "../../src/lib/opcoes";
import { sha256 } from "../lib/hash";
import { transcreverAudio } from "../lib/asr";
import { verificarTurnstile } from "../lib/turnstile";

interface Env {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  TURNSTILE_SECRET_KEY: string;
  TERMO_VERSAO: string;
  OPENAI_API_KEY: string;
}

function extensaoDe(nome: string): string | null {
  const lower = nome.toLowerCase();
  for (const ext of EXTENSOES_PERMITIDAS) {
    if (lower.endsWith(ext)) return ext;
  }
  return null;
}

function respostaJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function geraId(): string {
  return crypto.randomUUID();
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
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return respostaJson({ error: "Envie como multipart/form-data." }, 415);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return respostaJson({ error: "Não foi possível ler o corpo da requisição." }, 400);
  }

  const audio = form.get("audio");
  const dadosRaw = form.get("dados");
  if (!(audio instanceof File)) return respostaJson({ error: "Arquivo de áudio ausente." }, 400);
  if (typeof dadosRaw !== "string") return respostaJson({ error: "Metadados ausentes." }, 400);

  if (audio.size === 0) return respostaJson({ error: "Arquivo de áudio vazio." }, 400);
  if (audio.size > AUDIO_TAMANHO_MAX) return respostaJson({ error: "Arquivo acima do limite de 100 MB." }, 413);

  const extensao = extensaoDe(audio.name);
  if (!extensao) return respostaJson({ error: "Extensão de arquivo não suportada." }, 415);

  const mimetype = audio.type || "application/octet-stream";
  if (audio.type && !MIMETYPES_PERMITIDOS.includes(audio.type as (typeof MIMETYPES_PERMITIDOS)[number])) {
    return respostaJson({ error: `Tipo de arquivo não suportado (${audio.type}).` }, 415);
  }

  let dadosJson: unknown;
  try {
    dadosJson = JSON.parse(dadosRaw);
  } catch {
    return respostaJson({ error: "Metadados em JSON inválido." }, 400);
  }

  const parsed = submissaoSchema.safeParse(dadosJson);
  if (!parsed.success) {
    return respostaJson(
      {
        error: "Metadados inválidos.",
        issues: parsed.error.issues.map((i) => ({
          caminho: i.path.join("."),
          mensagem: i.message,
        })),
      },
      400,
    );
  }
  const dados = parsed.data;

  const ip = request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";

  const turnstileOk = await verificarTurnstile(dados.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!turnstileOk) return respostaJson({ error: "Falha na verificação anti-spam." }, 403);

  const audioBuffer = await audio.arrayBuffer();
  const hash = await sha256(audioBuffer);

  const duplicado = await env.DB.prepare(
    "SELECT id FROM submissions WHERE audio_hash = ? LIMIT 1",
  )
    .bind(hash)
    .first<{ id: string }>();
  if (duplicado) {
    return respostaJson(
      { error: "Este arquivo de áudio já foi recebido anteriormente (detectado por hash)." },
      409,
    );
  }

  const id = geraId();
  const agora = new Date().toISOString();
  const audioKey = `${agora.slice(0, 10)}/${id}${extensao}`;

  try {
    await env.AUDIO_BUCKET.put(audioKey, audioBuffer, {
      httpMetadata: { contentType: mimetype },
      customMetadata: {
        submission_id: id,
        pseudonimo: dados.pseudonimo,
        sotaque: dados.sotaque_declarado,
      },
    });
  } catch {
    return respostaJson({ error: "Falha ao armazenar o áudio. Tente novamente." }, 500);
  }

  const numFalantes = dados.falantes.length;

  const transcricao = await transcreverAudio(audioBuffer, mimetype, env.OPENAI_API_KEY);

  try {
    const stmtSubmission = env.DB.prepare(
      `INSERT INTO submissions (
        id, pseudonimo, sotaque_declarado, regiao_socializacao, estado_principal,
        cidade_microrregiao, faixa_etaria, genero, escolaridade, tipo_dispositivo, tipo_microfone,
        ambiente_gravacao, autoavaliacao_qualidade, audio_key, audio_hash, audio_tamanho,
        audio_mimetype, audio_nome_original, audio_duracao_segundos, num_falantes, transcricao, status_moderacao, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
    ).bind(
      id,
      dados.pseudonimo,
      dados.sotaque_declarado,
      dados.regiao_socializacao,
      dados.estado_principal,
      dados.cidade_microrregiao ?? null,
      dados.faixa_etaria,
      dados.genero,
      dados.escolaridade,
      dados.tipo_dispositivo ?? null,
      dados.tipo_microfone ?? null,
      dados.ambiente_gravacao ?? null,
      dados.autoavaliacao_qualidade ?? null,
      audioKey,
      hash,
      audio.size,
      mimetype,
      audio.name,
      dados.audio_duracao_segundos ?? null,
      numFalantes,
      transcricao,
      agora,
    );

    const stmtConsent = env.DB.prepare(
      `INSERT INTO consent_records (
        submission_id, email, termo_versao,
        checkbox_1, checkbox_2, checkbox_3, checkbox_4, checkbox_5, checkbox_6, checkbox_7,
        ip, user_agent, aceito_em, status_revogacao
      ) VALUES (?, ?, ?, 1, 1, 1, 1, 1, 1, 1, ?, ?, ?, 'ativo')`,
    ).bind(
      id,
      dados.email,
      env.TERMO_VERSAO,
      ip,
      userAgent,
      agora,
    );

    const stmtsSpeakers = dados.falantes
      .slice(1)
      .map((f, i) =>
        env.DB.prepare(
          `INSERT INTO submission_speakers (submission_id, speaker_index, sotaque, escolaridade)
           VALUES (?, ?, ?, ?)`,
        ).bind(id, i + 2, f.sotaque ?? null, f.escolaridade ?? null),
      );

    await env.DB.batch([stmtSubmission, stmtConsent, ...stmtsSpeakers]);
  } catch (err) {
    // rollback do arquivo no R2 se o banco falhar
    try {
      await env.AUDIO_BUCKET.delete(audioKey);
    } catch {
      // best effort
    }
    return respostaJson(
      {
        error: "Falha ao registrar a contribuição. Tente novamente.",
        detalhe: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }

  await invalidarCacheEstatisticas(request);

  return respostaJson({ id, termo_versao: env.TERMO_VERSAO }, 201);
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  return respostaJson({ error: `Método ${request.method} não permitido.` }, 405);
};
