// lib/captcha.ts
export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string) {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY!;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await res.json();
  return data?.success === true;
}