import { validarTokenAudio } from "../../lib/tokens";

interface Env {
  AUDIO_BUCKET: R2Bucket;
  APP_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const raw = params.token;
  const token = Array.isArray(raw) ? raw[0] : (raw as string | undefined);
  if (!token) return new Response("Not found", { status: 404 });

  const decoded = await validarTokenAudio(token, env.APP_SECRET);
  if (!decoded) return new Response("Forbidden", { status: 403 });

  const obj = await env.AUDIO_BUCKET.get(decoded.audioKey);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", obj.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("content-length", obj.size.toString());
  headers.set("cache-control", "no-store");
  return new Response(obj.body, { status: 200, headers });
};
