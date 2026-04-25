import { useEffect, useRef, useState } from "react";

const SUGESTOES = [
  "Conte como foi sua última viagem",
  "Me fale um pouco sobre sua carreira",
  "Qual é o seu filme preferido e por quê?",
  "Descreva sua cidade natal para alguém que nunca esteve lá",
  "Conte uma história engraçada que aconteceu com você",
  "Qual é a sua comida brasileira favorita e como você prepara?",
  "Me fale sobre um hobby ou passatempo que você curte",
  "Como foi seu último final de semana?",
  "Conte sobre alguém que te inspira",
  "Qual livro ou série te marcou recentemente e por quê?",
  "Se pudesse morar em qualquer cidade do Brasil, qual escolheria?",
  "Fale sobre o melhor show ou evento que você já foi",
];

type Estado = "idle" | "gravando" | "gravado" | "erro";

type Props = {
  onGravado: (file: File, duracao: number) => void;
  maxBytes: number;
  disabled?: boolean;
};

function formatar(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function extensaoPara(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export default function GravadorAudio({ onGravado, maxBytes, disabled = false }: Props) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [duracao, setDuracao] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [sugestoes] = useState<string[]>(() => {
    const copia = [...SUGESTOES];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, 5);
  });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inicioRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  async function iniciar() {
    setErro(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErro("Seu navegador não suporta gravação. Use o campo de envio de arquivo.");
      setEstado("erro");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const candidatos = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType =
        typeof MediaRecorder !== "undefined"
          ? candidatos.find((m) => MediaRecorder.isTypeSupported(m)) ?? ""
          : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const tipoBase = (recorder.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunksRef.current, { type: tipoBase });
        setPreviewUrl(URL.createObjectURL(blob));
        setEstado("gravado");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      inicioRef.current = performance.now();
      setEstado("gravando");
      setDuracao(0);
      timerRef.current = window.setInterval(() => {
        setDuracao((performance.now() - inicioRef.current) / 1000);
      }, 100);
    } catch {
      setErro(
        "Não consegui acessar o microfone. Verifique se você permitiu o acesso nas configurações do navegador.",
      );
      setEstado("erro");
    }
  }

  function parar() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
  }

  function descartar() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    chunksRef.current = [];
    setDuracao(0);
    setErro(null);
    setEstado("idle");
  }

  function usar() {
    const tipoBase = (recorderRef.current?.mimeType || "audio/webm").split(";")[0];
    const blob = new Blob(chunksRef.current, { type: tipoBase });
    if (blob.size > maxBytes) {
      setErro("A gravação ficou grande demais. Tente um trecho mais curto.");
      return;
    }
    const ext = extensaoPara(tipoBase);
    const file = new File([blob], `gravacao-${Date.now()}.${ext}`, { type: tipoBase });
    onGravado(file, duracao);
    // Reset pra permitir gravar mais (caso de batch)
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    chunksRef.current = [];
    setDuracao(0);
    setErro(null);
    setEstado("idle");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amarelo-300/60 bg-amarelo-50/70 p-4 text-sm text-verde-900">
        <p className="font-medium">
          <span aria-hidden>💬</span> Precisando de ideia? Tenta falar sobre:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-verde-800">
          {sugestoes.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-verde-800/70">
          Ou fale sobre qualquer outro assunto. O importante é que seja natural e espontâneo.
        </p>
      </div>

      {estado === "idle" && (
        <button
          type="button"
          onClick={iniciar}
          disabled={disabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-verde-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-verde-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-verde-800/80"
        >
          <MicIcon />
          {disabled ? "Limite de áudios atingido" : "Começar gravação"}
        </button>
      )}

      {estado === "gravando" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <span className="inline-flex h-3 w-3 flex-shrink-0 rounded-full bg-red-500 motion-safe:animate-pulse" aria-hidden />
          <span className="font-mono text-sm tabular-nums text-red-900">{formatar(duracao)}</span>
          <span className="text-sm text-verde-800">Gravando…</span>
          <button
            type="button"
            onClick={parar}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <StopIcon />
            Parar
          </button>
        </div>
      )}

      {estado === "gravado" && previewUrl && (
        <div className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <audio src={previewUrl} controls className="w-full sm:flex-1" />
            <span className="text-xs tabular-nums text-verde-800/70">{formatar(duracao)}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={usar}
              className="flex-1 rounded-md bg-verde-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-verde-700"
            >
              Adicionar à lista
            </button>
            <button
              type="button"
              onClick={descartar}
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-verde-800 hover:bg-stone-50"
            >
              Descartar e gravar de novo
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.5a3 3 0 00-3 3v7.5a3 3 0 006 0v-7.5a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v3m-4 0h8" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}
