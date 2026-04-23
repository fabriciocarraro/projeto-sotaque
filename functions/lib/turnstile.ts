export async function verificarTurnstile(
  token: string,
  secret: string,
  ip: string | null,
): Promise<boolean> {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!resp.ok) return false;
  const data = (await resp.json()) as { success?: boolean };
  return !!data.success;
}
