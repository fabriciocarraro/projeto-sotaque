import { useEffect, useMemo, useState } from "react";
import { BRASIL_PATHS, BRASIL_VIEWBOX } from "../lib/brasil-paths";
import { ESTADOS } from "../lib/opcoes";

type EstadoStat = {
  uf: string;
  contribuicoes: number;
  segundos: number;
};

type EstadoCalculado = {
  uf: string;
  nome: string;
  populacao: number;
  contribuicoes: number;
  segundos: number;
  porMilhao: number;
  ranking: number | null;
};

const POP_BY_UF: Record<string, { nome: string; populacao: number }> = ESTADOS.reduce(
  (acc, e) => {
    acc[e.valor] = { nome: e.rotulo, populacao: e.populacao };
    return acc;
  },
  {} as Record<string, { nome: string; populacao: number }>,
);

function formatarDuracao(seg: number): string {
  if (seg < 60) return `${Math.round(seg)}s`;
  if (seg < 3600) {
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return s > 0 ? `${m}min ${s}s` : `${m}min`;
  }
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function corDoEstado(porMilhao: number, maxPorMilhao: number, contribs: number): string {
  if (contribs === 0) return "#fef3c7"; // amarelo-100, "vazio"
  if (maxPorMilhao === 0) return "#d1fae5";
  // intensidade de 0..1
  const t = Math.min(1, porMilhao / maxPorMilhao);
  // gradiente de verde-100 (#dcfce7) a verde-700 (#15803d) via interpolação HSL
  // Verde-100: 142, 76%, 91% / Verde-700: 142, 72%, 29%
  const h = 142;
  const s = 76 - t * 4; // 76 -> 72
  const l = 91 - t * 62; // 91 -> 29
  return `hsl(${h}deg ${s}% ${l}%)`;
}

export default function MapaBrasil() {
  const [stats, setStats] = useState<EstadoStat[] | null>(null);
  const [erro, setErro] = useState(false);
  const [hover, setHover] = useState<{ uf: string; x: number; y: number } | null>(null);
  const [animado, setAnimado] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch("/api/estatisticas-estados")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { por_estado: EstadoStat[] }) => {
        if (ativo) setStats(j.por_estado);
      })
      .catch(() => {
        if (ativo) setErro(true);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Anima entrada após primeira renderização
  useEffect(() => {
    const t = setTimeout(() => setAnimado(true), 50);
    return () => clearTimeout(t);
  }, []);

  const calculados = useMemo<EstadoCalculado[]>(() => {
    const dados = stats ?? [];
    const map = new Map<string, EstadoStat>(dados.map((d) => [d.uf, d]));
    const lista: EstadoCalculado[] = Object.keys(BRASIL_PATHS).map((uf) => {
      const stat = map.get(uf);
      const pop = POP_BY_UF[uf];
      const contribuicoes = stat?.contribuicoes ?? 0;
      const segundos = stat?.segundos ?? 0;
      const populacao = pop?.populacao ?? 1;
      const porMilhao = (contribuicoes / populacao) * 1_000_000;
      return {
        uf,
        nome: pop?.nome ?? uf,
        populacao,
        contribuicoes,
        segundos,
        porMilhao,
        ranking: null,
      };
    });
    // ranking apenas para quem tem >= 1 contribuição
    const ordenados = [...lista]
      .filter((e) => e.contribuicoes > 0)
      .sort((a, b) => b.porMilhao - a.porMilhao);
    ordenados.forEach((e, i) => {
      e.ranking = i + 1;
    });
    return lista;
  }, [stats]);

  const maxPorMilhao = useMemo(
    () => Math.max(0, ...calculados.map((e) => e.porMilhao)),
    [calculados],
  );

  // estado em destaque: o que mais "precisa" — menor per capita (preferindo zerados)
  const destaque = useMemo<EstadoCalculado | null>(() => {
    const zerados = calculados.filter((e) => e.contribuicoes === 0);
    if (zerados.length > 0) {
      // entre os zerados, prefere o de maior população (mais visibilidade pra mais gente)
      return zerados.sort((a, b) => b.populacao - a.populacao)[0];
    }
    const naoZero = calculados.filter((e) => e.contribuicoes > 0);
    if (naoZero.length === 0) return null;
    return [...naoZero].sort((a, b) => a.porMilhao - b.porMilhao)[0];
  }, [calculados]);

  const ufLookup = useMemo(() => {
    const m = new Map<string, EstadoCalculado>();
    for (const c of calculados) m.set(c.uf, c);
    return m;
  }, [calculados]);

  const stateAtual = hover ? ufLookup.get(hover.uf) ?? null : null;

  return (
    <div className="relative">
      <div className="relative">
        <svg
          viewBox={`0 0 ${BRASIL_VIEWBOX.width} ${BRASIL_VIEWBOX.height}`}
          xmlns="http://www.w3.org/2000/svg"
          className="block w-full"
          role="img"
          aria-label="Mapa do Brasil colorido por contribuições por milhão de habitantes"
          onMouseLeave={() => setHover(null)}
        >
          {Object.entries(BRASIL_PATHS).map(([uf, info], idx) => {
            const calc = ufLookup.get(uf);
            const cor = calc
              ? corDoEstado(calc.porMilhao, maxPorMilhao, calc.contribuicoes)
              : "#fef3c7";
            const ehDestaque = destaque?.uf === uf;
            const ehHover = hover?.uf === uf;
            return (
              <path
                key={uf}
                d={info.d}
                fill={cor}
                stroke={ehHover || ehDestaque ? "#15803d" : "#65a30d"}
                strokeWidth={ehHover ? 1.6 : ehDestaque ? 1.4 : 0.8}
                style={{
                  transition: "all 250ms ease",
                  transform: ehHover ? "scale(1.01)" : "scale(1)",
                  transformOrigin: "center",
                  transformBox: "fill-box",
                  opacity: animado ? 1 : 0,
                  transitionDelay: animado ? `${Math.min(idx * 18, 500)}ms` : "0ms",
                  cursor: "default",
                  outline: "none",
                }}
                tabIndex={0}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!rect) return setHover({ uf, x: 0, y: 0 });
                  const bbox = e.currentTarget.getBBox();
                  const cx = ((bbox.x + bbox.width / 2) / BRASIL_VIEWBOX.width) * rect.width;
                  const cy = ((bbox.y + bbox.height / 2) / BRASIL_VIEWBOX.height) * rect.height;
                  setHover({ uf, x: cx, y: cy });
                }}
                onFocus={() => setHover({ uf, x: 0, y: 0 })}
                onBlur={() => setHover(null)}
                aria-label={
                  calc
                    ? `${calc.nome}: ${calc.contribuicoes} ${calc.contribuicoes === 1 ? "contribuição" : "contribuições"}, ${calc.porMilhao.toFixed(2)} por milhão de habitantes`
                    : info.name
                }
              />
            );
          })}
          {destaque && (
            <DestaqueIndicador
              path={BRASIL_PATHS[destaque.uf].d}
              animado={animado}
            />
          )}
        </svg>

        {stateAtual && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-verde-700/40 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
            style={{
              left: `${(hover!.x / (hover!.y > 0 ? 1 : 1)) }px`,
              top: `${hover!.y}px`,
              transform: "translate(-50%, calc(-100% - 8px))",
              maxWidth: 240,
            }}
          >
            <p className="font-semibold text-verde-900">
              {stateAtual.nome}
              {stateAtual.ranking !== null && (
                <span className="ml-1.5 text-verde-700">· {stateAtual.ranking}º</span>
              )}
            </p>
            {stateAtual.contribuicoes === 0 ? (
              <>
                <p className="mt-0.5 text-verde-800">Nenhuma contribuição ainda</p>
                <p className="mt-0.5 font-medium text-verde-700">Seja o primeiro!</p>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-verde-800">
                  {stateAtual.contribuicoes}{" "}
                  {stateAtual.contribuicoes === 1 ? "contribuição" : "contribuições"} ·{" "}
                  {formatarDuracao(stateAtual.segundos)}
                </p>
                <p className="mt-0.5 text-verde-800/70">
                  {stateAtual.porMilhao.toFixed(2)} por milhão de habitantes
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Destaque + Legenda */}
      <div className="mt-3 space-y-2.5">
        {destaque && destaque.contribuicoes === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-verde-600/40 bg-verde-50 px-3 py-2 text-xs text-verde-900 motion-safe:animate-pulse">
            <span aria-hidden>🎯</span>
            <span>
              <strong className="font-semibold">{destaque.nome}</strong> ainda não tem nenhuma voz.{" "}
              <span className="text-verde-700">Seja o primeiro!</span>
            </span>
          </div>
        )}
        {destaque && destaque.contribuicoes > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-verde-600/40 bg-verde-50 px-3 py-2 text-xs text-verde-900">
            <span aria-hidden>🎯</span>
            <span>
              <strong className="font-semibold">{destaque.nome}</strong> está sub-representado.{" "}
              <span className="text-verde-700">Sua voz pode mudar isso.</span>
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-verde-800/70">
          <span className="font-medium uppercase tracking-wide">Per capita</span>
          <span className="text-verde-800/40">·</span>
          <span>Contribuições por milhão de habitantes</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] tabular-nums text-verde-800/70">
          <span>Vazio</span>
          <div className="h-2 flex-1 rounded-sm bg-gradient-to-r from-amarelo-100 via-verde-200 to-verde-700" />
          <span>Topo</span>
        </div>
      </div>

      {erro && !stats && (
        <p className="mt-2 text-xs text-verde-800/60">Não foi possível carregar dados ao vivo.</p>
      )}
    </div>
  );
}

function DestaqueIndicador({ path, animado }: { path: string; animado: boolean }) {
  // Pulse animation visual no estado em destaque, via stroke
  return (
    <path
      d={path}
      fill="none"
      stroke="#15803d"
      strokeWidth={2.5}
      style={{
        opacity: animado ? 0.6 : 0,
        transition: "opacity 800ms ease",
        transitionDelay: "700ms",
        pointerEvents: "none",
      }}
      className="motion-safe:animate-pulse"
    />
  );
}
