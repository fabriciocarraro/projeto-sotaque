import { revogacaoSchema } from "../../src/lib/revogacao";
import { verificarTurnstile } from "../lib/turnstile";

interface Env {
  DB: D1Database;
  TURNSTILE_SECRET_KEY: string;
}

function respostaJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respostaJson({ error: "JSON inválido." }, 400);
  }

  const parsed = revogacaoSchema.safeParse(body);
  if (!parsed.success) {
    return respostaJson(
      {
        error: "Dados inválidos.",
        issues: parsed.error.issues.map((i) => ({
          caminho: i.path.join("."),
          mensagem: i.message,
        })),
      },
      400,
    );
  }
  const dados = parsed.data;
  const ip = request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";

  const turnstileOk = await verificarTurnstile(dados.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!turnstileOk) return respostaJson({ error: "Falha na verificação anti-spam." }, 403);

  const id = crypto.randomUUID();
  const agora = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO revocation_requests (id, email, submission_id, motivo, ip, user_agent, criado_em, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente')`,
    )
      .bind(id, dados.email, dados.submission_id ?? null, dados.motivo ?? null, ip, userAgent, agora)
      .run();
  } catch {
    return respostaJson({ error: "Falha ao registrar o pedido. Tente novamente." }, 500);
  }

  return respostaJson({ id }, 201);
};

export const onRequest: PagesFunction<Env> = async ({ request }) => {
  return respostaJson({ error: `Método ${request.method} não permitido.` }, 405);
};
