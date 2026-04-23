import { useEffect, useState } from "react";

const META_HORAS = 10_000;

type Estatisticas = {
  total_segundos: number;
};

export default function BarraMeta() {
  const [horas, setHoras] = useState<number | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch("/api/estatisticas")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Estatisticas) => {
        if (ativo) setHoras(j.total_segundos / 3600);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const pct = horas !== null ? Math.min(100, (horas / META_HORAS) * 100) : 0;
  const pctTexto = pct < 0.1 ? "<0,1%" : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  return (
    <div className="border-b border-verde-600/10 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium text-verde-900">
            Meta inicial: <span className="text-verde-700">10.000 horas</span> de vozes brasileiras
          </p>
          {horas !== null && (
            <span className="flex-shrink-0 text-xs tabular-nums text-verde-800/70">
              {pctTexto} concluído
            </span>
          )}
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-verde-100">
          <div
            className="h-full rounded-full bg-verde-600 transition-all duration-700"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={Math.round(pct * 10) / 10}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso em direção à meta de 10.000 horas"
          />
        </div>
      </div>
    </div>
  );
}
