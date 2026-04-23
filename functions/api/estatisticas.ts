interface Env {
  DB: D1Database;
}

type StatsRow = {
  total_contribuicoes: number | null;
  total_segundos: number | null;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let row: StatsRow | null = null;
  try {
    row = await env.DB.prepare(
      `SELECT
         COUNT(*) AS total_contribuicoes,
         COALESCE(SUM(audio_duracao_segundos), 0) AS total_segundos
       FROM submissions
       WHERE status_moderacao != 'rejeitado'`,
    ).first<StatsRow>();
  } catch {
    return new Response(JSON.stringify({ error: "Falha ao consultar estatísticas." }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const total_contribuicoes = row?.total_contribuicoes ?? 0;
  const total_segundos = Math.max(0, Math.floor(row?.total_segundos ?? 0));

  const body = JSON.stringify({
    total_contribuicoes,
    total_segundos,
    total_horas: +(total_segundos / 3600).toFixed(2),
    atualizado_em: new Date().toISOString(),
  });

  const resp = new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
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
