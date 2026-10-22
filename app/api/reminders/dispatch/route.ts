import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderRow = {
  id: string;
  user_id: string;
  session_id: string;
  weekday: number;
  time_local: string;
  timezone: string;
  minutes_before: number;
  last_sent_at: string | null;
};

type SessionRow = { id: string; focus: string; duration_minutes: number; plan_id: string };
type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type TreatmentReminderRow = {
  id: string;
  user_id: string;
  exercise_name: string;
  dose: string;
  weekdays: number[];
  time_local: string;
  timezone: string;
  last_sent_at: string | null;
};
type NutritionReminderRow = {
  id: string;
  user_id: string;
  weekday: number;
  meal_name: string;
  meal_summary: string;
  time_local: string;
  timezone: string;
  last_sent_at: string | null;
};

const weekdayIndexes: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { weekday: weekdayIndexes[value.weekday], minute: Number(value.hour) * 60 + Number(value.minute) };
}

function isDue(reminder: ReminderRow, now: Date) {
  let clock: ReturnType<typeof localClock>;
  try {
    clock = localClock(now, reminder.timezone);
  } catch {
    return false;
  }

  const [hour, minute] = reminder.time_local.split(":").map(Number);
  let deliveryMinute = hour * 60 + minute - reminder.minutes_before;
  let deliveryWeekday = reminder.weekday;
  if (deliveryMinute < 0) {
    deliveryMinute += 24 * 60;
    deliveryWeekday = (deliveryWeekday + 6) % 7;
  }

  const sentRecently = reminder.last_sent_at && now.getTime() - new Date(reminder.last_sent_at).getTime() < 20 * 60 * 60 * 1000;
  return !sentRecently && clock.weekday === deliveryWeekday && clock.minute >= deliveryMinute && clock.minute < deliveryMinute + 10;
}

function isTreatmentDue(reminder: TreatmentReminderRow, now: Date) {
  let clock: ReturnType<typeof localClock>;
  try {
    clock = localClock(now, reminder.timezone);
  } catch {
    return false;
  }
  const [hour, minute] = reminder.time_local.split(":").map(Number);
  const deliveryMinute = hour * 60 + minute;
  const sentRecently = reminder.last_sent_at && now.getTime() - new Date(reminder.last_sent_at).getTime() < 20 * 60 * 60 * 1000;
  return !sentRecently && reminder.weekdays.includes(clock.weekday) && clock.minute >= deliveryMinute && clock.minute < deliveryMinute + 10;
}

function isNutritionDue(reminder: NutritionReminderRow, now: Date) {
  let clock: ReturnType<typeof localClock>;
  try { clock = localClock(now, reminder.timezone); } catch { return false; }
  const [hour, minute] = reminder.time_local.split(":").map(Number);
  const deliveryMinute = hour * 60 + minute;
  const sentRecently = reminder.last_sent_at && now.getTime() - new Date(reminder.last_sent_at).getTime() < 20 * 60 * 60 * 1000;
  return !sentRecently && clock.weekday === reminder.weekday && clock.minute >= deliveryMinute && clock.minute < deliveryMinute + 10;
}

async function dispatch(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return Response.json({ error: "Web Push no está configurado." }, { status: 503 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const supabase = createSupabaseAdminClient();
  const [{ data, error }, { data: treatmentData, error: treatmentError }, { data: nutritionData, error: nutritionError }] = await Promise.all([
    supabase.from("workout_reminders").select("id,user_id,session_id,weekday,time_local,timezone,minutes_before,last_sent_at").eq("enabled", true),
    supabase.from("treatment_reminders").select("id,user_id,exercise_name,dose,weekdays,time_local,timezone,last_sent_at").eq("enabled", true),
    supabase.from("nutrition_reminders").select("id,user_id,weekday,meal_name,meal_summary,time_local,timezone,last_sent_at").eq("enabled", true),
  ]);
  if (error || treatmentError || (nutritionError && nutritionError.code !== "42P01")) return Response.json({ error: error?.message ?? treatmentError?.message ?? nutritionError?.message }, { status: 500 });

  const now = new Date();
  const due = (data as ReminderRow[]).filter((reminder) => isDue(reminder, now));
  const treatmentDue = (treatmentData as TreatmentReminderRow[]).filter((reminder) => isTreatmentDue(reminder, now));
  const nutritionDue = (nutritionData as NutritionReminderRow[]).filter((reminder) => isNutritionDue(reminder, now));
  if (!due.length && !treatmentDue.length && !nutritionDue.length) return Response.json({ ok: true, due: 0, sent: 0 });

  const userIds = [...new Set([...due.map((reminder) => reminder.user_id), ...treatmentDue.map((reminder) => reminder.user_id), ...nutritionDue.map((reminder) => reminder.user_id)])];
  const sessionIds = [...new Set(due.map((reminder) => reminder.session_id))];
  const { data: subscriptions } = await supabase.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", userIds);
  const { data: sessions } = sessionIds.length
    ? await supabase.from("planned_sessions").select("id,focus,duration_minutes,plan_id").in("id", sessionIds)
    : { data: [] as SessionRow[] };
  const sessionById = new Map(((sessions ?? []) as SessionRow[]).map((session) => [session.id, session]));
  const subscriptionsByUser = new Map<string, SubscriptionRow[]>();
  for (const subscription of (subscriptions ?? []) as SubscriptionRow[]) {
    subscriptionsByUser.set(subscription.user_id, [...(subscriptionsByUser.get(subscription.user_id) ?? []), subscription]);
  }

  let sent = 0;
  async function sendToUser(userId: string, payload: Record<string, string>) {
    let delivered = false;
    for (const device of subscriptionsByUser.get(userId) ?? []) {
      try {
        await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(payload));
        delivered = true;
        sent += 1;
      } catch (failure) {
        const statusCode = typeof failure === "object" && failure && "statusCode" in failure ? Number(failure.statusCode) : 0;
        if (statusCode === 404 || statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", device.id);
      }
    }
    return delivered;
  }

  for (const reminder of due) {
    const session = sessionById.get(reminder.session_id);
    const delivered = await sendToUser(reminder.user_id, {
      title: `Tu rutina empieza ${reminder.minutes_before ? `en ${reminder.minutes_before} min` : "ahora"}`,
      body: `${session?.focus ?? "Sesión programada"} · ${session?.duration_minutes ?? ""} min`,
      url: `/entrenamiento?session=${encodeURIComponent(reminder.session_id)}`,
      tag: `workout-${reminder.id}`,
    });
    if (delivered) await supabase.from("workout_reminders").update({ last_sent_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", reminder.id);
  }

  for (const reminder of treatmentDue) {
    const delivered = await sendToUser(reminder.user_id, {
      title: "Momento de tu ejercicio de recuperación",
      body: `${reminder.exercise_name}${reminder.dose ? ` · ${reminder.dose}` : ""}`,
      url: "/plan#recordatorios",
      tag: `treatment-${reminder.id}`,
    });
    if (delivered) await supabase.from("treatment_reminders").update({ last_sent_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", reminder.id);
  }

  for (const reminder of nutritionDue) {
    const delivered = await sendToUser(reminder.user_id, {
      title: `Hora de ${reminder.meal_name}`,
      body: reminder.meal_summary || "Revisa la comida programada para hoy.",
      url: `/nutricion?day=${reminder.weekday}`,
      tag: `nutrition-${reminder.id}`,
    });
    if (delivered) await supabase.from("nutrition_reminders").update({ last_sent_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", reminder.id);
  }

  return Response.json({ ok: true, due: due.length + treatmentDue.length + nutritionDue.length, workoutDue: due.length, treatmentDue: treatmentDue.length, nutritionDue: nutritionDue.length, sent });
}

export const GET = dispatch;
export const POST = dispatch;
