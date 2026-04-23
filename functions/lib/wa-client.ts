const WA_API = "https://graph.facebook.com/v21.0";

type Item = { id: string; title: string; description?: string };

export class WhatsAppClient {
  constructor(private token: string, private phoneId: string) {}

  private async post(body: unknown): Promise<Response> {
    return fetch(`${WA_API}/${this.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.post({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    });
  }

  async sendButtons(to: string, body: string, buttons: Item[]): Promise<void> {
    await this.post({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    });
  }

  async sendList(
    to: string,
    body: string,
    buttonText: string,
    rows: Item[],
    sectionTitle = "Opções",
  ): Promise<void> {
    await this.post({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: {
          button: buttonText.slice(0, 20),
          sections: [
            {
              title: sectionTitle.slice(0, 24),
              rows: rows.slice(0, 10).map((r) => ({
                id: r.id,
                title: r.title.slice(0, 24),
                description: r.description?.slice(0, 72),
              })),
            },
          ],
        },
      },
    });
  }

  async downloadMedia(mediaId: string): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
    const metaResp = await fetch(`${WA_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!metaResp.ok) throw new Error(`Falha ao obter metadata de mídia ${mediaId}`);
    const meta = (await metaResp.json()) as { url: string; mime_type: string };

    const fileResp = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!fileResp.ok) throw new Error(`Falha ao baixar mídia ${mediaId}`);
    const buffer = await fileResp.arrayBuffer();
    return { buffer, mimeType: meta.mime_type };
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.post({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  }
}

export async function verificarAssinaturaWA(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // comparação em tempo constante
  if (hex.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < hex.length; i++) result |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return result === 0;
}
