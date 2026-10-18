import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubscriptionPayload = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });

  let subscription: SubscriptionPayload;
  try {
    subscription = await request.json() as SubscriptionPayload;
  } catch {
    return Response.json({ error: "Suscripción inválida." }, { status: 400 });
  }

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    return Response.json({ error: "La suscripción no contiene todas las claves requeridas." }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: request.headers.get("user-agent"),
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) return Response.json({ error: "No pudimos guardar este dispositivo.", detail: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const payload = await request.json().catch(() => ({})) as { endpoint?: string };
  if (!payload.endpoint) return Response.json({ error: "Falta el dispositivo." }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", payload.endpoint);
  if (error) return Response.json({ error: "No pudimos desactivar este dispositivo." }, { status: 500 });
  return Response.json({ ok: true });
}
