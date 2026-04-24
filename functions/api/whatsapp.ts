import { verificarAssinaturaWA, WhatsAppClient } from "../lib/wa-client";
import { processarMensagem, type Env, type MensagemEntrada } from "../lib/wa-flow";

interface WebhookEnv extends Env {
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_APP_SECRET: string;
}

// Verificação inicial do webhook (GET do Meta)
export const onRequestGet: PagesFunction<WebhookEnv> = async ({ request, env }) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
};

type WaChange = {
  value?: {
    messages?: Array<{
      from: string;
      id: string;
      type: string;
      text?: { body: string };
      audio?: { id: string; mime_type: string };
      interactive?: {
        type: string;
        button_reply?: { id: string; title: string };
        list_reply?: { id: string; title: string };
      };
    }>;
  };
};
type WaEntry = { changes?: WaChange[] };
type WaPayload = { object?: string; entry?: WaEntry[] };

function extrairMensagem(m: NonNullable<NonNullable<WaChange["value"]>["messages"]>[number]): MensagemEntrada {
  if (m.type === "text" && m.text) return { tipo: "text", texto: m.text.body };
  if (m.type === "audio" && m.audio) return { tipo: "audio", mediaId: m.audio.id, mimeType: m.audio.mime_type };
  if (m.type === "interactive" && m.interactive) {
    if (m.interactive.button_reply) {
      return { tipo: "button", id: m.interactive.button_reply.id, title: m.interactive.button_reply.title };
    }
    if (m.interactive.list_reply) {
      return { tipo: "list", id: m.interactive.list_reply.id, title: m.interactive.list_reply.title };
    }
  }
  return { tipo: "outro" };
}

export const onRequestPost: PagesFunction<WebhookEnv> = async ({ request, env, waitUntil }) => {
  const raw = await request.text();
  const sig = request.headers.get("x-hub-signature-256");

  if (!(await verificarAssinaturaWA(raw, sig, env.WHATSAPP_APP_SECRET))) {
    return new Response("Forbidden", { status: 403 });
  }

  let payload: WaPayload;
  try {
    payload = JSON.parse(raw) as WaPayload;
  } catch {
    return new Response("OK", { status: 200 });
  }

  const client = new WhatsAppClient(env.WHATSAPP_ACCESS_TOKEN, env.WHATSAPP_PHONE_NUMBER_ID);
  const origin = new URL(request.url).origin;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        try {
          await client.markAsRead(m.id);
        } catch {
          // best effort
        }
        try {
          const msg = extrairMensagem(m);
          await processarMensagem(env, client, m.from, msg, m.id, origin, waitUntil);
        } catch (err) {
          console.error("Erro ao processar mensagem WhatsApp:", err);
        }
      }
    }
  }

  return new Response("OK", { status: 200 });
};
