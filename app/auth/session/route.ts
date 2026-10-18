import { createSupabaseServerClient } from "@/lib/supabase/server";

type SessionPayload = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null) as SessionPayload | null;
  if (typeof payload?.email !== "string" || typeof payload.password !== "string") {
    return Response.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  });

  if (error || !data.user) {
    const detail = error?.message ?? "Supabase no devolvió un usuario autenticado.";
    const message = /invalid login credentials/i.test(detail)
      ? "Correo o contraseña incorrectos."
      : /email not confirmed/i.test(detail)
        ? "Confirma tu correo antes de iniciar sesión."
        : /rate limit|too many requests/i.test(detail)
          ? "Hay demasiados intentos de acceso. Espera unos minutos y vuelve a intentarlo."
          : detail;
    console.error("[auth/session] Supabase rechazó el inicio de sesión", {
      code: error?.code,
      status: error?.status,
      message: detail,
    });
    const status = error?.status && error.status >= 400 && error.status <= 599 ? error.status : 401;
    return Response.json({ error: message, code: error?.code ?? "unknown_auth_error" }, { status });
  }

  return Response.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
