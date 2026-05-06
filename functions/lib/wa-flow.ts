import { ESCOLARIDADES, FAIXAS_ETARIAS, GENEROS, SOTAQUES, valoresDe } from "../../src/lib/opcoes";
import { enviarParaElevenLabs } from "./asr-elevenlabs";
import { gerarTokenAudio } from "./tokens";
import { sha256 } from "./hash";
import {
  COPY,
  LISTA_ESCOLARIDADES,
  LISTA_FAIXAS_ETARIAS,
  LISTA_GENEROS,
  SOTAQUES_LISTA_1,
  SOTAQUES_LISTA_2,
} from "./wa-copy";
import { WhatsAppClient } from "./wa-client";
import {
  extrairEstado,
  normalizarEmail,
  normalizarPseudonimo,
  transcreverAudio,
  validarSotaque,
} from "./wa-extract";

export type Estado =
  | "novo"
  | "aguardando_aceite"
  | "aguardando_audio"
  | "coletando_pseudonimo"
  | "coletando_email"
  | "coletando_faixa_etaria"
  | "coletando_genero"
  | "coletando_escolaridade"
  | "coletando_estado"
  | "coletando_cidade"
  | "coletando_sotaque"
  | "coletando_sotaque_mais"
  | "aguardando_confirmacao"
  | "concluido";

export type Metadados = {
  pseudonimo?: string;
  email?: string;
  faixa_etaria?: string;
  genero?: string;
  escolaridade?: string;
  estado?: string;
  cidade?: string;
  sotaque?: string;
};

export type Sessao = {
  phone: string;
  state: Estado;
  metadata: Metadados;
  audio_key: string | null;
  audio_hash: string | null;
  audio_tamanho: number | null;
  audio_mimetype: string | null;
  audio_duracao_segundos: number | null;
  audio_nome_original: string | null;
  audio_transcricao: string | null;
};

export type MensagemEntrada =
  | { tipo: "text"; texto: string }
  | { tipo: "audio"; mediaId: string; mimeType: string }
  | { tipo: "button"; id: string; title: string }
  | { tipo: "list"; id: string; title: string }
  | { tipo: "outro" };

export type Env = {
  DB: D1Database;
  AUDIO_BUCKET: R2Bucket;
  TERMO_VERSAO: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  OPENAI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  APP_SECRET: string;
};

function rotuloDe<T extends readonly { valor: string; rotulo: string }[]>(lista: T, valor?: string): string {
  if (!valor) return "—";
  return lista.find((i) => i.valor === valor)?.rotulo ?? valor;
}

function formatarDuracao(seg: number | null): string {
  if (!seg) return "";
  if (seg < 60) return `${Math.round(seg)}s`;
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  return `${m}min${s > 0 ? ` ${s}s` : ""}`;
}

async function carregarSessao(db: D1Database, phone: string): Promise<Sessao | null> {
  const row = await db
    .prepare("SELECT * FROM whatsapp_sessions WHERE phone = ?")
    .bind(phone)
    .first<{
      phone: string;
      state: string;
      metadata_json: string | null;
      audio_key: string | null;
      audio_hash: string | null;
      audio_tamanho: number | null;
      audio_mimetype: string | null;
      audio_duracao_segundos: number | null;
      audio_nome_original: string | null;
      audio_transcricao: string | null;
    }>();
  if (!row) return null;
  return {
    phone: row.phone,
    state: row.state as Estado,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Metadados) : {},
    audio_key: row.audio_key,
    audio_hash: row.audio_hash,
    audio_tamanho: row.audio_tamanho,
    audio_mimetype: row.audio_mimetype,
    audio_duracao_segundos: row.audio_duracao_segundos,
    audio_nome_original: row.audio_nome_original,
    audio_transcricao: row.audio_transcricao,
  };
}

async function salvarSessao(db: D1Database, s: Sessao): Promise<void> {
  const agora = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO whatsapp_sessions (
        phone, state, current_step, metadata_json,
        audio_key, audio_hash, audio_tamanho, audio_mimetype, audio_duracao_segundos, audio_nome_original, audio_transcricao,
        criado_em, atualizado_em
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        state = excluded.state,
        metadata_json = excluded.metadata_json,
        audio_key = excluded.audio_key,
        audio_hash = excluded.audio_hash,
        audio_tamanho = excluded.audio_tamanho,
        audio_mimetype = excluded.audio_mimetype,
        audio_duracao_segundos = excluded.audio_duracao_segundos,
        audio_nome_original = excluded.audio_nome_original,
        audio_transcricao = excluded.audio_transcricao,
        atualizado_em = excluded.atualizado_em`,
    )
    .bind(
      s.phone,
      s.state,
      JSON.stringify(s.metadata),
      s.audio_key,
      s.audio_hash,
      s.audio_tamanho,
      s.audio_mimetype,
      s.audio_duracao_segundos,
      s.audio_nome_original,
      s.audio_transcricao,
      agora,
      agora,
    )
    .run();
}

async function logarMensagem(
  db: D1Database,
  phone: string,
  direction: "in" | "out",
  tipo: string,
  conteudo: string | null,
  waMessageId: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO whatsapp_messages (phone, direction, tipo, conteudo, wa_message_id, criado_em)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(phone, direction, tipo, conteudo, waMessageId, new Date().toISOString())
    .run();
}

async function textoDaMensagem(
  msg: MensagemEntrada,
  env: Env,
  client: WhatsAppClient,
): Promise<string | null> {
  if (msg.tipo === "text") return msg.texto;
  if (msg.tipo === "audio") {
    try {
      const { buffer, mimeType } = await client.downloadMedia(msg.mediaId);
      return await transcreverAudio(buffer, mimeType, env.OPENAI_API_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

async function enviarPergunta(client: WhatsAppClient, phone: string, estado: Estado): Promise<void> {
  switch (estado) {
    case "coletando_pseudonimo":
      await client.sendText(phone, COPY.perguntaPseudonimo);
      break;
    case "coletando_email":
      await client.sendText(phone, COPY.perguntaEmail);
      break;
    case "coletando_faixa_etaria":
      await client.sendList(phone, COPY.perguntaFaixaEtaria, "Escolher", LISTA_FAIXAS_ETARIAS, "Faixa etária");
      break;
    case "coletando_genero":
      await client.sendList(phone, COPY.perguntaGenero, "Escolher", LISTA_GENEROS, "Gênero");
      break;
    case "coletando_escolaridade":
      await client.sendList(phone, COPY.perguntaEscolaridade, "Escolher", LISTA_ESCOLARIDADES, "Escolaridade");
      break;
    case "coletando_estado":
      await client.sendText(phone, COPY.perguntaEstado);
      break;
    case "coletando_cidade":
      await client.sendText(phone, COPY.perguntaCidade);
      break;
    case "coletando_sotaque":
      await client.sendList(phone, COPY.perguntaSotaque, "Escolher", [
        ...SOTAQUES_LISTA_1,
        { id: "_mais", title: COPY.verMaisSotaques },
      ], "Sotaque");
      break;
    case "coletando_sotaque_mais":
      await client.sendList(phone, COPY.perguntaSotaque, "Escolher", SOTAQUES_LISTA_2, "Sotaque");
      break;
  }
}

async function enviarConfirmacao(client: WhatsAppClient, phone: string, m: Metadados): Promise<void> {
  const mostrar = {
    pseudonimo: m.pseudonimo ?? "—",
    email: m.email ?? "—",
    faixa_etaria: rotuloDe(FAIXAS_ETARIAS, m.faixa_etaria),
    genero: rotuloDe(GENEROS, m.genero),
    escolaridade: rotuloDe(ESCOLARIDADES, m.escolaridade),
    sotaque: rotuloDe(SOTAQUES, m.sotaque),
    estado: m.estado ?? "—",
    cidade: m.cidade ?? "",
  };
  await client.sendButtons(phone, COPY.confirmacao(mostrar), [
    { id: "confirmar", title: "Confirmar envio" },
    { id: "refazer", title: "Recomeçar" },
  ]);
}

async function persistirContribuicao(
  env: Env,
  sessao: Sessao,
  origin: string,
): Promise<{ id: string; audioUrl: string }> {
  const m = sessao.metadata;
  const id = crypto.randomUUID();
  const agora = new Date().toISOString();

  const audioToken = await gerarTokenAudio(
    sessao.audio_key!,
    Date.now() + 24 * 60 * 60 * 1000,
    env.APP_SECRET,
  );
  const audioUrl = `${origin}/api/audio-privado/${audioToken}`;

  const stmtSubmission = env.DB.prepare(
    `INSERT INTO submissions (
      id, pseudonimo, sotaque_declarado, regiao_socializacao, estado_principal,
      cidade_microrregiao, faixa_etaria, genero, escolaridade,
      audio_key, audio_hash, audio_tamanho,
      audio_mimetype, audio_nome_original, audio_duracao_segundos, num_falantes,
      transcricao, transcricao_status, asr_request_id, transcricao_provider, status_moderacao, criado_em, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, 'pendente', NULL, 'elevenlabs', 'pendente', ?, 'whatsapp')`,
  ).bind(
    id,
    m.pseudonimo!,
    m.sotaque!,
    regiaoDoEstado(m.estado!),
    m.estado!,
    m.cidade ?? null,
    m.faixa_etaria!,
    m.genero!,
    m.escolaridade!,
    sessao.audio_key!,
    sessao.audio_hash!,
    sessao.audio_tamanho!,
    sessao.audio_mimetype!,
    sessao.audio_nome_original!,
    sessao.audio_duracao_segundos,
    agora,
  );

  const stmtConsent = env.DB.prepare(
    `INSERT INTO consent_records (
      submission_id, email, termo_versao,
      checkbox_1, checkbox_2, checkbox_3, checkbox_4, checkbox_5, checkbox_6, checkbox_7,
      ip, user_agent, aceito_em, status_revogacao
    ) VALUES (?, ?, ?, 1, 1, 1, 1, 1, 1, 1, ?, ?, ?, 'ativo')`,
  ).bind(id, m.email!, env.TERMO_VERSAO, `whatsapp:${sessao.phone}`, "whatsapp-bot", agora);

  await env.DB.batch([stmtSubmission, stmtConsent]);
  return { id, audioUrl };
}

export async function dispararTranscricao(
  env: Env,
  id: string,
  audioUrl: string,
): Promise<void> {
  const requestId = await enviarParaElevenLabs(audioUrl, env.ELEVENLABS_API_KEY);
  if (requestId) {
    await env.DB.prepare(`UPDATE submissions SET asr_request_id = ? WHERE id = ?`)
      .bind(requestId, id)
      .run();
  } else {
    await env.DB.prepare(`UPDATE submissions SET transcricao_status = 'falhou' WHERE id = ?`)
      .bind(id)
      .run();
  }
}

function regiaoDoEstado(uf: string): string {
  const mapa: Record<string, string> = {
    AC: "norte", AM: "norte", AP: "norte", PA: "norte", RO: "norte", RR: "norte", TO: "norte",
    AL: "nordeste", BA: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste",
    PE: "nordeste", PI: "nordeste", RN: "nordeste", SE: "nordeste",
    DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
    ES: "sudeste", MG: "sudeste", RJ: "sudeste", SP: "sudeste",
    PR: "sul", RS: "sul", SC: "sul",
  };
  return mapa[uf] ?? "sudeste";
}

export async function processarMensagem(
  env: Env,
  client: WhatsAppClient,
  phone: string,
  msg: MensagemEntrada,
  waMessageId: string | null,
  origin: string,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<void> {
  let sessao = (await carregarSessao(env.DB, phone)) ?? {
    phone,
    state: "novo" as Estado,
    metadata: {},
    audio_key: null,
    audio_hash: null,
    audio_tamanho: null,
    audio_mimetype: null,
    audio_duracao_segundos: null,
    audio_nome_original: null,
    audio_transcricao: null,
  };

  // log da mensagem recebida
  const logConteudo =
    msg.tipo === "text" ? msg.texto :
    msg.tipo === "audio" ? `[audio:${msg.mediaId}]` :
    msg.tipo === "button" ? `[button:${msg.id}]` :
    msg.tipo === "list" ? `[list:${msg.id}]` : "[outro]";
  await logarMensagem(env.DB, phone, "in", msg.tipo, logConteudo, waMessageId);

  // ---- ESTADO: novo ou aguardando_aceite ----
  if (sessao.state === "novo") {
    await client.sendButtons(phone, COPY.boasVindas, [
      { id: "aceito", title: "Aceito e contribuir" },
      { id: "nao", title: "Agora não" },
    ]);
    sessao.state = "aguardando_aceite";
    await salvarSessao(env.DB, sessao);
    return;
  }

  if (sessao.state === "aguardando_aceite") {
    if (msg.tipo === "button" && msg.id === "aceito") {
      sessao.state = "aguardando_audio";
      await client.sendText(phone, COPY.aposAceite);
      await salvarSessao(env.DB, sessao);
    } else if (msg.tipo === "button" && msg.id === "nao") {
      await client.sendText(phone, COPY.recusou);
      // reset: apaga sessão para começar do zero se voltar
      await env.DB.prepare("DELETE FROM whatsapp_sessions WHERE phone = ?").bind(phone).run();
    } else {
      await client.sendButtons(phone, COPY.boasVindas, [
        { id: "aceito", title: "Aceito e contribuir" },
        { id: "nao", title: "Agora não" },
      ]);
    }
    return;
  }

  // ---- ESTADO: aguardando_audio ----
  if (sessao.state === "aguardando_audio") {
    if (msg.tipo === "audio") {
      await processarAudioEntrante(env, client, sessao, msg.mediaId);
      return;
    }
    await client.sendText(
      phone,
      msg.tipo === "text" ? COPY.fallbackTextoSemAudio : COPY.fallbackMidiaNaoSuportada,
    );
    return;
  }

  // ---- ESTADOS: coletando_* ----
  // áudio ou texto → extrai valor
  const textoResp = await textoDaMensagem(msg, env, client);
  const idBotao = msg.tipo === "button" || msg.tipo === "list" ? msg.id : null;

  switch (sessao.state) {
    case "coletando_pseudonimo": {
      if (!textoResp) return void (await client.sendText(phone, COPY.fallbackNaoEntendi));
      const p = normalizarPseudonimo(textoResp);
      if (!p) return void (await client.sendText(phone, "Pseudônimo inválido. Use 2–60 caracteres (letras, números, espaço, hífen, ponto ou underline)."));
      sessao.metadata.pseudonimo = p;
      sessao.state = "coletando_email";
      await salvarSessao(env.DB, sessao);
      return void (await enviarPergunta(client, phone, sessao.state));
    }
    case "coletando_email": {
      if (!textoResp) return void (await client.sendText(phone, COPY.fallbackNaoEntendi));
      const e = normalizarEmail(textoResp);
      if (!e) return void (await client.sendText(phone, COPY.emailInvalido));
      sessao.metadata.email = e;
      sessao.state = "coletando_faixa_etaria";
      await salvarSessao(env.DB, sessao);
      return void (await enviarPergunta(client, phone, sessao.state));
    }
    case "coletando_faixa_etaria": {
      const ok = idBotao && (valoresDe(FAIXAS_ETARIAS) as readonly string[]).includes(idBotao);
      if (!ok) return void (await enviarPergunta(client, phone, sessao.state));
      sessao.metadata.faixa_etaria = idBotao!;
      sessao.state = "coletando_genero";
      await salvarSessao(env.DB, sessao);
      return void (await enviarPergunta(client, phone, sessao.state));
    }
    case "coletando_genero": {
      const ok = idBotao && (valoresDe(GENEROS) as readonly string[]).includes(idBotao);
      if (!ok) return void (await enviarPergunta(client, phone, sessao.state));
      sessao.metadata.genero = idBotao!;
      sessao.state = "coletando_escolaridade";
      await salvarSessao(env.DB, sessao);
      return void (await enviarPergunta(client, phone, sessao.state));
    }
    case "coletando_escolaridade": {
      const ok = idBotao && (valoresDe(ESCOLARIDADES) as readonly string[]).includes(idBotao);
      if (!ok) return void (await enviarPergunta(client, phone, sessao.state));
      sessao.metadata.escolaridade = idBotao!;
      sessao.state = "coletando_estado";
      await salvarSessao(env.DB, sessao);
      return void (await enviarPergunta(client, phone, sessao.state));
    }
    case "coletando_estado": {
      if (!textoResp) return void (await client.sendText(phone, COPY.fallbackNaoEntendi));
      const uf = await extrairEstado(textoResp, env.OPENAI_API_KEY);
      if (!uf) return void (await client.sendText(phone, COPY.estadoInvalido));
      sessao.metadata.estado = uf;
      sessao.state = "coletando_cidade";
      await salvarSessao(env.DB, sessao);
      return void (await enviarPergunta(client, phone, sessao.state));
    }
    case "coletando_cidade": {
      if (!textoResp) return void (await client.sendText(phone, COPY.fallbackNaoEntendi));
      const t = textoResp.trim();
      sessao.metadata.cidade = /^pular$/i.test(t) ? undefined : t.slice(0, 120);
      sessao.state = "coletando_sotaque";
      await salvarSessao(env.DB, sessao);
      return void (await enviarPergunta(client, phone, sessao.state));
    }
    case "coletando_sotaque": {
      if (idBotao === "_mais") {
        sessao.state = "coletando_sotaque_mais";
        await salvarSessao(env.DB, sessao);
        return void (await enviarPergunta(client, phone, sessao.state));
      }
      if (!idBotao || !validarSotaque(idBotao))
        return void (await client.sendText(phone, COPY.sotaqueInvalido));
      sessao.metadata.sotaque = idBotao;
      sessao.state = "aguardando_confirmacao";
      await salvarSessao(env.DB, sessao);
      return void (await enviarConfirmacao(client, phone, sessao.metadata));
    }
    case "coletando_sotaque_mais": {
      if (!idBotao || !validarSotaque(idBotao))
        return void (await client.sendText(phone, COPY.sotaqueInvalido));
      sessao.metadata.sotaque = idBotao;
      sessao.state = "aguardando_confirmacao";
      await salvarSessao(env.DB, sessao);
      return void (await enviarConfirmacao(client, phone, sessao.metadata));
    }
    case "aguardando_confirmacao": {
      if (msg.tipo === "button" && msg.id === "confirmar") {
        const { id, audioUrl } = await persistirContribuicao(env, sessao, origin);
        await client.sendText(phone, COPY.sucesso(id));
        await env.DB.prepare("DELETE FROM whatsapp_sessions WHERE phone = ?").bind(phone).run();
        waitUntil(dispararTranscricao(env, id, audioUrl));
        return;
      }
      if (msg.tipo === "button" && msg.id === "refazer") {
        sessao.state = "coletando_pseudonimo";
        sessao.metadata = {};
        await salvarSessao(env.DB, sessao);
        return void (await enviarPergunta(client, phone, sessao.state));
      }
      return void (await enviarConfirmacao(client, phone, sessao.metadata));
    }
  }
}

async function processarAudioEntrante(
  env: Env,
  client: WhatsAppClient,
  sessao: Sessao,
  mediaId: string,
): Promise<void> {
  const phone = sessao.phone;
  let buffer: ArrayBuffer;
  let mimeType: string;
  try {
    ({ buffer, mimeType } = await client.downloadMedia(mediaId));
  } catch {
    await client.sendText(phone, COPY.erroGenerico);
    return;
  }

  const hash = await sha256(buffer);
  const duplicado = await env.DB.prepare("SELECT id FROM submissions WHERE audio_hash = ? LIMIT 1")
    .bind(hash)
    .first<{ id: string }>();
  if (duplicado) {
    await client.sendText(phone, COPY.audioDuplicado);
    return;
  }

  const extensao = mimeType.includes("ogg") ? ".ogg" : mimeType.includes("mpeg") ? ".mp3" : ".audio";
  const nowIso = new Date().toISOString();
  const audioId = crypto.randomUUID();
  const audioKey = `${nowIso.slice(0, 10)}/${audioId}${extensao}`;

  await env.AUDIO_BUCKET.put(audioKey, buffer, {
    httpMetadata: { contentType: mimeType },
    customMetadata: { source: "whatsapp", phone },
  });

  const transcricao = await transcreverAudio(buffer, mimeType, env.OPENAI_API_KEY);

  // duração: não temos como medir sem decoder — deixa null; curadoria manual depois
  sessao.audio_key = audioKey;
  sessao.audio_hash = hash;
  sessao.audio_tamanho = buffer.byteLength;
  sessao.audio_mimetype = mimeType;
  sessao.audio_duracao_segundos = null;
  sessao.audio_nome_original = `whatsapp-${mediaId}${extensao}`;
  sessao.audio_transcricao = transcricao;
  sessao.state = "coletando_pseudonimo";
  await salvarSessao(env.DB, sessao);

  await client.sendText(phone, COPY.audioRecebido(formatarDuracao(null) || "recebido"));
  await enviarPergunta(client, phone, sessao.state);
}
