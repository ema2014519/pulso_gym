"use client";

import { Bell, BellRing, Check, ChevronRight, Clock3, LoaderCircle, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { NutritionDayPlan } from "@/lib/training";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ReminderDraft = { enabled: boolean; time: string };
type StoredReminder = { weekday: number; meal_index: number; enabled: boolean; time_local: string };
type SupportState = "checking" | "unsupported" | "default" | "denied" | "enabled";

function reminderKey(weekday: number, mealIndex: number) {
  return `${weekday}-${mealIndex}`;
}

function initialDrafts(schedule: NutritionDayPlan[]) {
  return Object.fromEntries(schedule.flatMap((day) => day.meals.map((meal, mealIndex) => [reminderKey(day.weekday, mealIndex), { enabled: true, time: meal.time } satisfies ReminderDraft])));
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function getPushRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function NutritionReminders({ planId, schedule, selectedWeekday }: { planId?: string; schedule: NutritionDayPlan[]; selectedWeekday: number }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [drafts, setDrafts] = useState<Record<string, ReminderDraft>>(() => initialDrafts(schedule));
  const [support, setSupport] = useState<SupportState>("checking");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const selectedDay = schedule.find((day) => day.weekday === selectedWeekday) ?? schedule[0];

  useEffect(() => {
    if (!planId) return;
    void supabase.from("nutrition_reminders").select("weekday,meal_index,enabled,time_local").eq("plan_id", planId).then(({ data }) => {
      if (!data) return;
      setDrafts((current) => {
        const next = { ...current };
        for (const reminder of data as StoredReminder[]) next[reminderKey(reminder.weekday, reminder.meal_index)] = { enabled: reminder.enabled, time: reminder.time_local.slice(0, 5) };
        return next;
      });
    });
  }, [planId, supabase]);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return void Promise.resolve().then(() => setSupport("unsupported"));
    void navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      if (Notification.permission === "denied") return setSupport("denied");
      setSupport(await registration?.pushManager.getSubscription() ? "enabled" : "default");
    });
  }, []);

  async function activateNotifications() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) throw new Error("Falta configurar la clave pública de notificaciones.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Este navegador no admite notificaciones web.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setSupport(permission === "denied" ? "denied" : "default");
      throw new Error("Necesitamos tu permiso para enviar recordatorios.");
    }
    const registration = await getPushRegistration();
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "No pudimos registrar este dispositivo.");
    setSupport("enabled");
  }

  async function saveReminders() {
    if (!planId) return setMessage("Guarda o vuelve a abrir el plan antes de programar alertas.");
    setSaving(true); setMessage("");
    try {
      if (support !== "enabled") await activateNotifications();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload = schedule.flatMap((day) => day.meals.map((meal, mealIndex) => {
        const draft = drafts[reminderKey(day.weekday, mealIndex)] ?? { enabled: true, time: meal.time };
        return { user_id: user.id, plan_id: planId, weekday: day.weekday, meal_index: mealIndex, meal_name: meal.name, meal_summary: meal.foods.join(" · ").slice(0, 500), time_local: draft.time, timezone, enabled: draft.enabled, updated_at: new Date().toISOString() };
      }));
      const { error: saveError } = await supabase.from("nutrition_reminders").upsert(payload, { onConflict: "user_id,plan_id,weekday,meal_index" });
      if (saveError) throw new Error(saveError.message.includes("nutrition_reminders") ? "Falta aplicar la migración de alertas nutricionales en Supabase." : saveError.message);
      setMessage("Alertas guardadas para las 21 comidas de la semana.");
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "No pudimos guardar las alertas.");
    } finally { setSaving(false); }
  }

  function updateDraft(mealIndex: number, patch: Partial<ReminderDraft>) {
    const key = reminderKey(selectedDay.weekday, mealIndex);
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? { enabled: true, time: selectedDay.meals[mealIndex].time }), ...patch } }));
  }

  return <details className="nutrition-reminders" id="alertas-nutricion">
    <summary><span className="nutrition-reminder-icon"><BellRing size={20} /></span><span><small>Alertas del celular</small><strong>Recordatorios de comidas</strong><em>{support === "enabled" ? "Dispositivo listo" : "Toca para configurar"}</em></span><ChevronRight size={18} /></summary>
    <div className="nutrition-reminders-body">
      <header><div><h3>{selectedDay.day}</h3><p>Ajusta los avisos de este día. Al guardar se conservarán también los horarios de los demás días.</p></div>{support === "enabled" && <span><Smartphone size={15} /> Alertas activas</span>}</header>
      <div className="nutrition-reminder-list">{selectedDay.meals.map((meal, mealIndex) => {
        const draft = drafts[reminderKey(selectedDay.weekday, mealIndex)] ?? { enabled: true, time: meal.time };
        return <article className={draft.enabled ? "is-enabled" : ""} key={`${selectedDay.weekday}-${mealIndex}`}>
          <label className="nutrition-reminder-toggle"><input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft(mealIndex, { enabled: event.target.checked })} /><span aria-hidden="true" /><span><strong>{meal.name}</strong><small>{meal.foods.join(" · ")}</small></span></label>
          <label><span><Clock3 size={14} /> Hora</span><input type="time" value={draft.time} disabled={!draft.enabled} onChange={(event) => updateDraft(mealIndex, { time: event.target.value })} /></label>
        </article>;
      })}</div>
      {support === "denied" && <p className="nutrition-reminder-warning">Las notificaciones están bloqueadas en el navegador. Actívalas en la configuración del sitio.</p>}
      {support === "unsupported" && <p className="nutrition-reminder-warning">Este navegador no admite alertas web. Instala Pulso o usa Chrome en Android.</p>}
      <footer><p role="status" aria-live="polite">{message}</p><button className="button button-primary" type="button" disabled={saving || support === "unsupported" || support === "denied"} onClick={() => void saveReminders()}>{saving ? <LoaderCircle className="spin" size={17} /> : support === "enabled" ? <Check size={17} /> : <Bell size={17} />}{saving ? "Guardando…" : "Guardar alertas"}</button></footer>
    </div>
  </details>;
}
