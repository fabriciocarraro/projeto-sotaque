type Options = {
  model?: string;
  language?: string;
  diarize?: boolean;
};

export async function enviarParaDeepgram(
  audioUrl: string,
  callbackUrl: string,
  apiKey: string,
  opts: Options = {},
): Promise<string | null> {
  if (!apiKey) return null;

  const params = new URLSearchParams({
    model: opts.model ?? "nova-2",
    language: opts.language ?? "pt-BR",
    smart_format: "true",
    punctuate: "true",
    callback: callbackUrl,
  });
  if (opts.diarize) params.set("diarize", "true");

  try {
    const resp = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error(`Deepgram ${resp.status}: ${txt}`);
      return null;
    }

    const data = (await resp.json()) as { request_id?: string };
    return data.request_id ?? null;
  } catch (err) {
    console.error("Deepgram fetch error:", err);
    return null;
  }
}

export function extrairTranscricao(payload: unknown): string | null {
  const p = payload as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
  };
  const transcript = p.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  if (typeof transcript === "string" && transcript.trim()) return transcript.trim();
  return null;
}
