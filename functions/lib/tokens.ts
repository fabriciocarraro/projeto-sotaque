const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function assinar(data: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64urlEncode(new Uint8Array(sig));
}

async function verificar(data: string, signature: string, secret: string): Promise<boolean> {
  const key = await importHmacKey(secret);
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlDecode(signature),
      encoder.encode(data),
    );
  } catch {
    return false;
  }
}

// Token para /api/audio-privado/<token>: contém audio_key + expiração
export async function gerarTokenAudio(
  audioKey: string,
  expiraEmMs: number,
  secret: string,
): Promise<string> {
  const payload = JSON.stringify({ k: audioKey, e: Math.floor(expiraEmMs / 1000) });
  const payloadB64 = base64urlEncode(encoder.encode(payload));
  const sig = await assinar(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function validarTokenAudio(
  token: string,
  secret: string,
): Promise<{ audioKey: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!(await verificar(payloadB64, sig, secret))) return null;
  try {
    const payload = JSON.parse(decoder.decode(base64urlDecode(payloadB64))) as {
      k: string;
      e: number;
    };
    if (payload.e * 1000 < Date.now()) return null;
    return { audioKey: payload.k };
  } catch {
    return null;
  }
}

// Token para /api/deepgram-callback/<token>: apenas assina o submission_id
export async function gerarTokenCallback(
  submissionId: string,
  secret: string,
): Promise<string> {
  const sig = await assinar(submissionId, secret);
  return `${submissionId}.${sig}`;
}

export async function validarTokenCallback(
  token: string,
  secret: string,
): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [submissionId, sig] = parts;
  if (!(await verificar(submissionId, sig, secret))) return null;
  return submissionId;
}
