"use client";

import { AlarmClock, Bell, BellRing, ChevronRight, Clock3, Minus, Plus, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { recoveryExercisesForCurrentPhase, type PlannedSession, type RecoveryProfile } from "@/lib/training";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ReminderDraft = { enabled: boolean; time: string; minutesBefore: number };
type StoredReminder = { session_id: string; enabled: boolean; time_local: string; minutes_before: number };
type TreatmentDraft = { enabled: boolean; exerciseName: string; dose: string; times: string[]; weekdays: number[] };
type StoredTreatmentReminder = { exercise_index: number; occurrence: number; exercise_name: string; dose: string; enabled: boolean; time_local: string; weekdays: number[] };
type SupportState = "checking" | "unsupported" | "default" | "denied" | "enabled";

const shortDays = ["D", "L", "M", "X", "J", "V", "S"];
const fullDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const dayIndexes: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

function normalizeDay(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function defaultWeekdays(sessionsPerWeek: number) {
  const presets: Record<number, number[]> = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6] };
  return presets[Math.min(6, Math.max(1, Math.round(sessionsPerWeek)))] ?? [0, 1, 2, 3, 4, 5, 6];
}

function inferredTimesPerDay(exercise: ReturnType<typeof recoveryExercisesForCurrentPhase>[number]) {
  if (Number.isFinite(exercise.timesPerDay) && Number(exercise.timesPerDay) >= 1) return Math.round(Number(exercise.timesPerDay));
  const description = `${exercise.dose} ${exercise.instructions}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const match = description.match(/(\d+)\s*(?:veces|x)\s*(?:al|por)?\s*dia/);
  return match ? Math.max(1, Number(match[1])) : 1;
}

function defaultTimes(count: number, suggested: string[] = []) {
  const valid = suggested.filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)).slice(0, count);
  if (valid.length === count) return valid;
  if (count === 1) return [valid[0] ?? "09:00"];
  return Array.from({ length: count }, (_, index) => {
    if (valid[index]) return valid[index];
    const totalMinutes = Math.round(480 + (720 * index) / (count - 1));
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  });
}

function addTreatmentTime(times: string[]) {
  const minutes = times.map((time) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }).sort((first, second) => first - second);
  const points = [360, ...minutes, 1320];
  let start = points[0];
  let widestGap = -1;
  for (let index = 0; index < points.length - 1; index += 1) {
    const gap = points[index + 1] - points[index];
    if (gap > widestGap) {
      widestGap = gap;
      start = points[index];
    }
  }
  const candidate = Math.min(1439, start + Math.max(1, Math.floor(widestGap / 2)));
  const next = [...minutes, candidate].sort((first, second) => first - second);
  return next.map((value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`);
}

function initialTreatmentDrafts(recovery?: RecoveryProfile) {
  return Object.fromEntries(recoveryExercisesForCurrentPhase(recovery).map((exercise, index) => {
    const count = inferredTimesPerDay(exercise);
    return [String(index), {
      enabled: true,
      exerciseName: exercise.name,
      dose: exercise.dose,
      times: defaultTimes(count, exercise.suggestedTimes),
      weekdays: defaultWeekdays(exercise.sessionsPerWeek),
    } satisfies TreatmentDraft];
  }));
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function getPushRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export function WorkoutReminders({ planId, sessions, recovery }: { planId?: string; sessions: PlannedSession[]; recovery?: RecoveryProfile }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const persistedSessions = useMemo(() => sessions.filter((session) => session.databaseId), [sessions]);
  const [drafts, setDrafts] = useState<Record<string, ReminderDraft>>(() => Object.fromEntries(
    sessions.filter((session) => session.databaseId).map((session) => [session.databaseId!, { enabled: true, time: "18:00", minutesBefore: 15 }]),
  ));
  const recoveryExercises = useMemo(() => recoveryExercisesForCurrentPhase(recovery), [recovery]);
  const activePhaseIndex = recovery?.activePhaseIndex ?? 0;
  const activePhaseName = recovery?.phases?.[activePhaseIndex]?.name ?? recovery?.phase?.replaceAll("_", " ") ?? "Fase activa";
  const [treatmentDrafts, setTreatmentDrafts] = useState<Record<string, TreatmentDraft>>(() => initialTreatmentDrafts(recovery));
  const [support, setSupport] = useState<SupportState>("checking");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isIosBrowser, setIsIosBrowser] = useState(false);

  useEffect(() => {
    if (!persistedSessions.length) return;

    void supabase.from("workout_reminders")
      .select("session_id,enabled,time_local,minutes_before")
      .in("session_id", persistedSessions.map((session) => session.databaseId!))
      .then(({ data }) => {
        if (!data) return;
        setDrafts((current) => {
          const next = { ...current };
          for (const reminder of data as StoredReminder[]) next[reminder.session_id] = {
            enabled: reminder.enabled,
            time: reminder.time_local.slice(0, 5),
            minutesBefore: reminder.minutes_before,
          };
          return next;
        });
      });
  }, [persistedSessions, supabase]);

  useEffect(() => {
    if (!planId || !recoveryExercises.length) return;
    void supabase.from("treatment_reminders")
      .select("exercise_index,occurrence,exercise_name,dose,enabled,time_local,weekdays")
      .eq("plan_id", planId)
      .eq("phase_index", activePhaseIndex)
      .order("occurrence")
      .then(({ data }) => {
        if (!data?.length) return;
        const grouped = new Map<number, StoredTreatmentReminder[]>();
        for (const reminder of data as StoredTreatmentReminder[]) grouped.set(reminder.exercise_index, [...(grouped.get(reminder.exercise_index) ?? []), reminder]);
        setTreatmentDrafts((current) => {
          const next = { ...current };
          for (const [exerciseIndex, reminders] of grouped) next[String(exerciseIndex)] = {
            enabled: reminders.some((reminder) => reminder.enabled),
            exerciseName: reminders[0].exercise_name,
            dose: reminders[0].dose,
            times: reminders.sort((first, second) => first.occurrence - second.occurrence).map((reminder) => reminder.time_local.slice(0, 5)),
            weekdays: reminders[0].weekdays,
          };
          return next;
        });
      });
  }, [activePhaseIndex, planId, recoveryExercises.length, supabase]);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return void Promise.resolve().then(() => setSupport("unsupported"));
    void navigator.serviceWorker.getRegistration("/").then(async (registration) => {
      setIsIosBrowser(/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches);
      if (Notification.permission === "denied") {
        setSupport("denied");
        return;
      }
      const subscription = await registration?.pushManager.getSubscription();
      setSupport(subscription ? "enabled" : "default");
    });
  }, []);

  function updateDraft(sessionId: string, patch: Partial<ReminderDraft>) {
    setDrafts((current) => ({ ...current, [sessionId]: { ...(current[sessionId] ?? { enabled: true, time: "18:00", minutesBefore: 15 }), ...patch } }));
  }

  function updateTreatmentDraft(exerciseIndex: number, patch: Partial<TreatmentDraft>) {
    setTreatmentDrafts((current) => ({ ...current, [String(exerciseIndex)]: { ...current[String(exerciseIndex)], ...patch } }));
  }

  function resizeTreatmentTimes(exerciseIndex: number, change: number) {
    const draft = treatmentDrafts[String(exerciseIndex)];
    if (!draft) return;
    const count = Math.max(1, draft.times.length + change);
    updateTreatmentDraft(exerciseIndex, { times: change > 0 ? addTreatmentTime(draft.times) : draft.times.slice(0, count) });
  }

  function toggleTreatmentWeekday(exerciseIndex: number, weekday: number) {
    const draft = treatmentDrafts[String(exerciseIndex)];
    if (!draft) return;
    const selected = draft.weekdays.includes(weekday);
    const weekdays = selected ? draft.weekdays.filter((day) => day !== weekday) : [...draft.weekdays, weekday].sort();
    if (weekdays.length) updateTreatmentDraft(exerciseIndex, { weekdays });
  }

  async function activateNotifications(showConfirmation = true) {
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
    if (showConfirmation) await registration.showNotification("Recordatorios activados", {
      body: "Pulso te avisará antes de tus próximas rutinas.",
      tag: "pulso-reminders-enabled",
      data: { url: "/plan" },
    });
  }

  async function enableNotifications() {
    setMessage("");
    try {
      await activateNotifications();
      setMessage("Este dispositivo ya puede recibir alertas.");
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "No pudimos activar las notificaciones.");
    }
  }

  async function saveReminders() {
    if (!planId || (!persistedSessions.length && !recoveryExercises.length)) {
      setMessage("Guarda o vuelve a abrir el plan antes de programar sus recordatorios.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      if (support !== "enabled") await activateNotifications(false);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const workoutPayload = persistedSessions.map((session) => ({
        user_id: user.id,
        plan_id: planId,
        session_id: session.databaseId!,
        weekday: dayIndexes[normalizeDay(session.day)] ?? 1,
        time_local: drafts[session.databaseId!]?.time ?? "18:00",
        timezone,
        minutes_before: drafts[session.databaseId!]?.minutesBefore ?? 15,
        enabled: drafts[session.databaseId!]?.enabled ?? true,
        updated_at: new Date().toISOString(),
      }));
      if (workoutPayload.length) {
        const { error } = await supabase.from("workout_reminders").upsert(workoutPayload, { onConflict: "user_id,session_id" });
        if (error) throw new Error(error.message.includes("workout_reminders") ? "Falta aplicar la migración de recordatorios en Supabase." : error.message);
      }

      if (recoveryExercises.length) {
        const { error: disableError } = await supabase.from("treatment_reminders").update({ enabled: false, updated_at: new Date().toISOString() }).eq("plan_id", planId);
        if (disableError) throw new Error(disableError.message.includes("treatment_reminders") ? "Falta aplicar la migración de alertas del tratamiento en Supabase." : disableError.message);
        const treatmentPayload = recoveryExercises.flatMap((exercise, exerciseIndex) => {
          const draft = treatmentDrafts[String(exerciseIndex)];
          if (!draft) return [];
          return draft.times.map((time, occurrence) => ({
            user_id: user.id,
            plan_id: planId,
            phase_index: activePhaseIndex,
            exercise_index: exerciseIndex,
            exercise_name: exercise.name,
            dose: exercise.dose,
            occurrence,
            weekdays: draft.weekdays,
            time_local: time,
            timezone,
            enabled: draft.enabled,
            updated_at: new Date().toISOString(),
          }));
        });
        if (treatmentPayload.length) {
          const { error } = await supabase.from("treatment_reminders").upsert(treatmentPayload, { onConflict: "user_id,plan_id,phase_index,exercise_index,occurrence" });
          if (error) throw new Error(error.message.includes("treatment_reminders") ? "Falta aplicar la migración de alertas del tratamiento en Supabase." : error.message);
        }
      }
      setMessage(recoveryExercises.length ? "Horarios guardados. Te avisaremos de cada ejercicio de la fase activa." : "Horario guardado. Te avisaremos en la hora local de este dispositivo.");
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "No pudimos guardar los recordatorios.");
    } finally {
      setIsSaving(false);
    }
  }

  return <details className="workout-reminders" id="recordatorios" open>
    <summary>
      <span className="workout-reminders-icon"><BellRing size={20} aria-hidden="true" /></span>
      <span><small>Agenda semanal</small><strong>Recordatorios de rutina</strong><em>{support === "enabled" ? "Alertas activas" : "Configura tus avisos"}</em></span>
      <ChevronRight size={19} aria-hidden="true" />
    </summary>
    <div className="workout-reminders-body">
      <div className="workout-reminders-intro">
        <div><h3>{recoveryExercises.length ? "Cumple cada dosis a su hora." : "Entrena a tu hora."}</h3><p>{recoveryExercises.length ? "Pulso separa las tomas diarias de los ejercicios de la fase activa y también conserva los avisos de entrenamiento." : "Programa cada sesión y elige cuánto antes quieres recibir la alerta en tu celular."}</p></div>
        {support !== "enabled" && support !== "unsupported" && <button className="button button-quiet" type="button" onClick={() => void enableNotifications()}><Bell size={17} aria-hidden="true" /> Activar alertas</button>}
        {support === "enabled" && <span className="reminder-device-ready"><Smartphone size={16} aria-hidden="true" /> Dispositivo listo</span>}
      </div>

      {isIosBrowser && <p className="reminder-tip"><Smartphone size={17} aria-hidden="true" /><span><strong>En iPhone:</strong> abre Compartir → Agregar a pantalla de inicio y activa las alertas desde la app instalada.</span></p>}
      {support === "denied" && <p className="reminder-warning">Las notificaciones están bloqueadas. Permítelas desde la configuración del navegador y vuelve a intentarlo.</p>}
      {support === "unsupported" && <p className="reminder-warning">Este navegador no admite Web Push. Prueba Chrome en Android o instala Pulso en la pantalla de inicio de tu iPhone.</p>}

      {recoveryExercises.length > 0 && <section className="treatment-reminders" aria-labelledby="treatment-reminders-title">
        <header><span><AlarmClock size={18} aria-hidden="true" /></span><div><small>Tratamiento · {activePhaseName}</small><h4 id="treatment-reminders-title">Avisos de ejercicios terapéuticos</h4><p>Los horarios sugeridos vienen de la dosis de la fase activa; puedes ajustarlos a tu día.</p></div></header>
        <div className="treatment-reminder-list">
          {recoveryExercises.map((exercise, exerciseIndex) => {
            const draft = treatmentDrafts[String(exerciseIndex)];
            if (!draft) return null;
            return <details className={draft.enabled ? "is-enabled" : ""} key={`${exercise.name}-${exerciseIndex}`}>
              <summary><span><strong>{exercise.name}</strong><small>{exercise.dose} · {draft.times.length} {draft.times.length === 1 ? "aviso" : "avisos"} al día</small></span><ChevronRight size={17} aria-hidden="true" /></summary>
              <div className="treatment-reminder-controls">
                <label className="reminder-session-toggle">
                  <input type="checkbox" checked={draft.enabled} onChange={(event) => updateTreatmentDraft(exerciseIndex, { enabled: event.target.checked })} />
                  <span aria-hidden="true" />
                  <span><strong>Alertas activas</strong><small>Solo para esta fase</small></span>
                </label>
                <div className="treatment-frequency"><span>Veces al día</span><div><button type="button" aria-label={`Quitar un aviso de ${exercise.name}`} disabled={!draft.enabled || draft.times.length === 1} onClick={() => resizeTreatmentTimes(exerciseIndex, -1)}><Minus size={16} aria-hidden="true" /></button><strong>{draft.times.length}</strong><button type="button" aria-label={`Agregar un aviso de ${exercise.name}`} disabled={!draft.enabled} onClick={() => resizeTreatmentTimes(exerciseIndex, 1)}><Plus size={16} aria-hidden="true" /></button></div></div>
                <fieldset disabled={!draft.enabled}><legend>Días de la semana</legend><div className="treatment-weekdays">{shortDays.map((day, weekday) => <button type="button" key={fullDays[weekday]} aria-label={fullDays[weekday]} aria-pressed={draft.weekdays.includes(weekday)} onClick={() => toggleTreatmentWeekday(exerciseIndex, weekday)}>{day}</button>)}</div></fieldset>
                <div className="treatment-times">{draft.times.map((time, occurrence) => <label key={`${exerciseIndex}-${occurrence}`}><span>Aviso {occurrence + 1}</span><input type="time" value={time} disabled={!draft.enabled} onChange={(event) => updateTreatmentDraft(exerciseIndex, { times: draft.times.map((current, index) => index === occurrence ? event.target.value : current) })} /></label>)}</div>
              </div>
            </details>;
          })}
        </div>
      </section>}

      {persistedSessions.length > 0 && <p className="reminder-section-label">Rutinas de entrenamiento</p>}
      <div className="reminder-session-list">
        {persistedSessions.map((session) => {
          const id = session.databaseId!;
          const draft = drafts[id] ?? { enabled: true, time: "18:00", minutesBefore: 15 };
          return <article className={draft.enabled ? "is-enabled" : ""} key={id}>
            <label className="reminder-session-toggle">
              <input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft(id, { enabled: event.target.checked })} />
              <span aria-hidden="true" />
              <span><strong>{session.day}</strong><small>{session.focus} · {session.durationMinutes} min</small></span>
            </label>
            <label><span><Clock3 size={15} aria-hidden="true" /> Hora</span><input type="time" value={draft.time} disabled={!draft.enabled} onChange={(event) => updateDraft(id, { time: event.target.value })} /></label>
            <label><span>Avisar</span><select value={draft.minutesBefore} disabled={!draft.enabled} onChange={(event) => updateDraft(id, { minutesBefore: Number(event.target.value) })}><option value={0}>Al comenzar</option><option value={10}>10 min antes</option><option value={15}>15 min antes</option><option value={30}>30 min antes</option><option value={60}>1 hora antes</option></select></label>
          </article>;
        })}
      </div>
      {!persistedSessions.length && !recoveryExercises.length && <p className="reminder-warning">Vuelve a abrir este plan después de guardarlo para programar sus sesiones.</p>}
      <div className="workout-reminders-footer">
        <p role="status" aria-live="polite">{message}</p>
        <button className="button button-primary" type="button" disabled={isSaving || (!persistedSessions.length && !recoveryExercises.length) || support === "unsupported" || support === "denied"} onClick={() => void saveReminders()}>{isSaving ? "Guardando…" : "Guardar recordatorios"}</button>
      </div>
    </div>
  </details>;
}
