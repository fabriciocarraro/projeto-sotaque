const OPENAI_MAX_BYTES = 25 * 1024 * 1024; // limite do endpoint /v1/audio/transcriptions

type Opcoes = {
  model?: string;
  language?: string;
};

function extensaoPara(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("flac")) return "flac";
  if (mimeType.includes("webm")) return "webm";
  return "audio";
}

export async function transcreverAudio(
  audio: ArrayBuffer,
  mimeType: string,
  openaiKey: string,
  opts: Opcoes = {},
): Promise<string | null> {
  if (!openaiKey) return null;
  if (audio.byteLength === 0 || audio.byteLength > OPENAI_MAX_BYTES) return null;

  const form = new FormData();
  form.append(
    "file",
    new Blob([audio], { type: mimeType }),
    `audio.${extensaoPara(mimeType)}`,
  );
  form.append("model", opts.model ?? "gpt-4o-transcribe");
  form.append("language", opts.language ?? "pt");
  form.append("response_format", "text");

  try {
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!resp.ok) return null;
    const txt = (await resp.text()).trim();
    return txt || null;
  } catch {
    return null;
  }
}
