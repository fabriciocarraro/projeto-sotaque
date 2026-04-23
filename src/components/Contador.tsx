import { useEffect, useRef, useState } from "react";

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

// easeOutCubic: começa rápido, desacelera no fim
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
    return (
      <div aria-hidden className="h-6" />
    );
  }

  const { valor, unidade } = formatarTempo(tempoAnimado);
  const n = Math.floor(contribAnimado);
  const plural = n === 1 ? "contribuição" : "contribuições";

  return (
    <p className="text-sm text-stone-700">
      O Projeto SOTAQUE já reuniu{" "}
      <strong className="font-semibold text-verde-700 tabular-nums">
        {valor} {unidade}
      </strong>{" "}
      de vozes brasileiras, em{" "}
      <strong className="font-semibold text-verde-700 tabular-nums">
        {n.toLocaleString("pt-BR")} {plural}
      </strong>
      .
    </p>
  );
}
