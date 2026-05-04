interface Env {
  DB: D1Database;
}

type EstadoRow = {
  estado_principal: string | null;
  total_contribuicoes: number | null;
  total_segundos: number | null;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let rows: EstadoRow[] = [];
  try {
    const result = await env.DB.prepare(
      `SELECT
         estado_principal,
         COUNT(*) AS total_contribuicoes,
         COALESCE(SUM(audio_duracao_segundos), 0) AS total_segundos
       FROM submissions
       WHERE status_moderacao != 'rejeitado' AND estado_principal IS NOT NULL
       GROUP BY estado_principal`,
    ).all<EstadoRow>();
    rows = result.results ?? [];
  } catch {
    return new Response(JSON.stringify({ error: "Falha ao consultar estatísticas." }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const porEstado = rows
    .filter((r) => r.estado_principal)
    .map((r) => ({
      uf: r.estado_principal!,
      contribuicoes: r.total_contribuicoes ?? 0,
      segundos: Math.max(0, Math.floor(r.total_segundos ?? 0)),
    }));

  const body = JSON.stringify({
    por_estado: porEstado,
    atualizado_em: new Date().toISOString(),
  });

  const resp = new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=60",
    },
  });

  await cache.put(cacheKey, resp.clone());
  return resp;
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  return new Response(JSON.stringify({ error: `Método ${request.method} não permitido.` }), {
    status: 405,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
