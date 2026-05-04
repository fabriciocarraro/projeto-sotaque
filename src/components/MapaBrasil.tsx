import { useEffect, useMemo, useRef, useState } from "react";
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

type PopupPos = { uf: string; cx: number; cy: number; below: boolean };

export default function MapaBrasil() {
  const [stats, setStats] = useState<EstadoStat[] | null>(null);
  const [erro, setErro] = useState(false);
  const [popup, setPopup] = useState<PopupPos | null>(null);
  const [animado, setAnimado] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function abrirPopup(uf: string, clientX: number, clientY: number) {
    const container = containerRef.current;
    if (!container) {
      setPopup({ uf, cx: 0, cy: 0, below: true });
      return;
    }
    const rect = container.getBoundingClientRect();
    let cx = clientX - rect.left;
    let cy = clientY - rect.top;

    // Clamp horizontal: popup tem ~210px de largura, halfW = 110 pra deixar margem
    const halfW = 110;
    cx = Math.max(halfW, Math.min(rect.width - halfW, cx));

    // Se o ponto está perto do topo, abre ABAIXO; senão, ACIMA
    const margemPopup = 90;
    const below = cy < margemPopup + 12;

    setPopup({ uf, cx, cy, below });
  }

  // Fecha popup ao tocar fora do mapa (mobile)
  useEffect(() => {
    function onPointerDownOutside(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => document.removeEventListener("pointerdown", onPointerDownOutside);
  }, []);

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

  const popupState = popup ? ufLookup.get(popup.uf) ?? null : null;

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={`0 0 ${BRASIL_VIEWBOX.width} ${BRASIL_VIEWBOX.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full"
        role="img"
        aria-label="Mapa do Brasil colorido por contribuições por milhão de habitantes"
      >
        {Object.entries(BRASIL_PATHS).map(([uf, info], idx) => {
          const calc = ufLookup.get(uf);
          const cor = calc
            ? corDoEstado(calc.porMilhao, maxPorMilhao, calc.contribuicoes)
            : "#fef3c7";
          const ehDestaque = destaque?.uf === uf;
          const ehAtivo = popup?.uf === uf;
          return (
            <path
              key={uf}
              d={info.d}
              fill={cor}
              stroke={ehAtivo || ehDestaque ? "#15803d" : "#65a30d"}
              strokeWidth={ehAtivo ? 1.6 : ehDestaque ? 1.4 : 0.8}
              style={{
                transition: "all 200ms ease",
                transform: ehAtivo ? "scale(1.01)" : "scale(1)",
                transformOrigin: "center",
                transformBox: "fill-box",
                opacity: animado ? 1 : 0,
                transitionDelay: animado ? `${Math.min(idx * 18, 500)}ms` : "0ms",
                cursor: "pointer",
                outline: "none",
                touchAction: "manipulation",
              }}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") abrirPopup(uf, e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (e.pointerType === "mouse") abrirPopup(uf, e.clientX, e.clientY);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") setPopup(null);
              }}
              onPointerDown={(e) => {
                if (e.pointerType !== "mouse") {
                  if (popup?.uf === uf) {
                    setPopup(null);
                  } else {
                    abrirPopup(uf, e.clientX, e.clientY);
                  }
                }
              }}
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

      {/* Popup flutuante posicionado pelo cursor/dedo */}
      {popup && popupState && (
        <div
          className="pointer-events-none absolute z-20 w-[210px] rounded-md border border-verde-700/40 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${popup.cx}px`,
            top: `${popup.cy}px`,
            transform: popup.below
              ? "translate(-50%, 14px)"
              : "translate(-50%, calc(-100% - 14px))",
          }}
          role="tooltip"
        >
          <p className="font-semibold text-verde-900">
            {popupState.nome}
            {popupState.ranking !== null && (
              <span className="ml-1.5 font-normal text-verde-700">· {popupState.ranking}º</span>
            )}
          </p>
          {popupState.contribuicoes === 0 ? (
            <>
              <p className="mt-0.5 text-verde-800">Nenhuma contribuição ainda</p>
              <p className="mt-0.5 font-medium text-verde-700">Seja o primeiro!</p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-verde-800">
                {popupState.contribuicoes}{" "}
                {popupState.contribuicoes === 1 ? "contribuição" : "contribuições"} ·{" "}
                {formatarDuracao(popupState.segundos)}
              </p>
              <p className="mt-0.5 text-verde-800/70">
                {popupState.porMilhao.toFixed(2)} por milhão de hab.
              </p>
            </>
          )}
        </div>
      )}

      {/* Legenda */}
      <div className="mt-3 space-y-1.5">
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
        <p className="text-[10px] text-verde-800/60">
          Toque num estado para ver os detalhes (ou passe o cursor no desktop).
        </p>
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
