import { useEffect, useRef, useState } from "react";

const META_INICIAL_HORAS = 1_000;
const META_FINAL_HORAS = 10_000;
const META_INICIAL_PCT = (META_INICIAL_HORAS / META_FINAL_HORAS) * 100;

type Estatisticas = {
  total_contribuicoes: number;
  total_segundos: number;
  total_horas: number;
  atualizado_em: string;
};

function formatarHoras(horas: number): string {
  if (horas >= 10) return horas.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (horas >= 1) return horas.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return horas.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatarTempo(segundos: number): { valor: string; unidade: string } {
  if (segundos < 60) return { valor: String(Math.floor(segundos)), unidade: "segundos" };
  if (segundos < 3600) {
    const m = segundos / 60;
    return {
      valor: m.toLocaleString("pt-BR", { maximumFractionDigits: m >= 10 ? 0 : 1 }),
      unidade: "minutos",
    };
  }
  const h = segundos / 3600;
  return { valor: formatarHoras(h), unidade: h === 1 ? "hora" : "horas" };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useContagemAnimada(alvo: number, duracaoMs = 1500): number {
  const [atual, setAtual] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (alvo <= 0) {
      setAtual(0);
      return;
    }
    const inicio = performance.now();
    const tick = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracaoMs);
      setAtual(alvo * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [alvo, duracaoMs]);

  return atual;
}

export default function Contador() {
  const [dados, setDados] = useState<Estatisticas | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch("/api/estatisticas")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: Estatisticas) => {
        if (ativo) setDados(j);
      })
      .catch(() => {
        if (ativo) setErro(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const tempoAnimado = useContagemAnimada(dados?.total_segundos ?? 0);
  const contribAnimado = useContagemAnimada(dados?.total_contribuicoes ?? 0);

  if (erro || !dados) {
    return <div aria-hidden className="h-10" />;
  }

  const { valor, unidade } = formatarTempo(tempoAnimado);
  const n = Math.floor(contribAnimado);
  const plural = n === 1 ? "contribuição" : "contribuições";

  const horasAnimadas = tempoAnimado / 3600;
  const pct = Math.min(100, (horasAnimadas / META_FINAL_HORAS) * 100);
  const pctTexto =
    pct < 0.1
      ? "<0,1%"
      : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  return (
    <div className="w-full text-center">
      <p className="inline-flex items-center justify-center gap-2 text-sm text-verde-900">
        <span className="inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-verde-600 motion-safe:animate-pulse" aria-hidden />
        <span>
          O Projeto SOTAQUE já reuniu{" "}
          <strong className="font-semibold text-verde-700 tabular-nums">
            {valor} {unidade}
          </strong>{" "}
          de vozes brasileiras, em{" "}
          <strong className="font-semibold text-verde-700 tabular-nums">
            {n.toLocaleString("pt-BR")} {plural}
          </strong>
        </span>
      </p>
      <div className="mx-auto mt-2.5 max-w-lg">
        <div className="relative">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full border border-verde-200 bg-verde-100"
            role="progressbar"
            aria-valuenow={Math.round(pct * 10) / 10}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso em direção à meta final de 10.000 horas"
          >
            <div
              className="h-full rounded-full bg-verde-600 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* marcador da meta inicial */}
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: `${META_INICIAL_PCT}%` }}
          >
            <div className="h-full w-px bg-verde-600/70" />
          </div>
          {/* marcador da meta final */}
          <div className="pointer-events-none absolute inset-y-0 right-0">
            <div className="h-full w-px bg-verde-600/70" />
          </div>
        </div>
        <div className="relative mt-1 h-8 text-[10px] tabular-nums text-verde-800/70">
          <span className="absolute left-0 top-0 text-left text-verde-800/60">
            {pctTexto} concluído
          </span>
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-center"
            style={{ left: `${META_INICIAL_PCT}%` }}
          >
            <span className="block font-semibold text-verde-800">1.000h</span>
            <span className="block text-verde-800/60">meta inicial</span>
          </span>
          <span className="absolute right-0 top-0 whitespace-nowrap text-right">
            <span className="block font-semibold text-verde-800">10.000h</span>
            <span className="block text-verde-800/60">meta final</span>
          </span>
        </div>
      </div>
    </div>
  );
}
