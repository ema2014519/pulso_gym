"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlarmClock, ArrowLeft, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, Droplets, Dumbbell, LoaderCircle, Pencil, Salad, Save, Sparkles, UtensilsCrossed } from "lucide-react";
import { AmbientGymBackground } from "../ambient-gym-background";
import { NutritionReminders } from "../nutrition-reminders";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mealStructureFromWeek, normalizeNutritionWeek, NUTRITION_WEEK_DAYS } from "@/lib/nutrition";
import { generateWeeklyPlan, type NutritionDayPlan, type NutritionProfile, type NutritionTargets, type PlanAssessment, type PlannedSession, type WeeklyPlan } from "@/lib/training";

type StoredPlanRow = {
  id: string; name: string; created_at: string; goal: WeeklyPlan["goal"]; experience_level: WeeklyPlan["level"];
  rationale: string; safety_note: string; assessment_snapshot: PlanAssessment | null; nutrition_targets: NutritionTargets | null;
  methodology: WeeklyPlan["methodology"] | null;
  planned_sessions: Array<{ id: string; day_name: string; context: PlannedSession["context"]; focus: PlannedSession["focus"]; duration_minutes: number; position: number; session_exercises: Array<{ id: string; name: string; home_alternative: string; sets: number; repetitions: string; rest_seconds: number; position: number }> }>;
};

type NutritionDraft = {
  estimatedCalories: number; proteinGrams: number; carbohydrateGrams: number; fatGrams: number; waterLiters: number;
  strategy: string; kitchenResources: string; accessibleFoods: string; unavailableFoods: string; recommendations: string;
  week: NutritionDayPlan[];
};

const planSelect = "id, name, created_at, goal, experience_level, rationale, safety_note, assessment_snapshot, nutrition_targets, methodology, planned_sessions(id, day_name, context, focus, duration_minutes, position, session_exercises(id, name, home_alternative, sets, repetitions, rest_seconds, position))";

function splitList(value: string) { return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))]; }

function mapStoredPlan(plan: StoredPlanRow): WeeklyPlan {
  return { databaseId: plan.id, name: plan.name, createdAt: plan.created_at, goal: plan.goal, level: plan.experience_level, rationale: plan.rationale, safetyNote: plan.safety_note, assessment: plan.assessment_snapshot ?? undefined, nutrition: plan.nutrition_targets ?? undefined, methodology: plan.methodology ?? undefined,
    sessions: [...(plan.planned_sessions ?? [])].sort((a, b) => a.position - b.position).map((session) => ({ id: session.id, databaseId: session.id, day: session.day_name, context: session.context, focus: session.focus, durationMinutes: session.duration_minutes, exercises: [...(session.session_exercises ?? [])].sort((a, b) => a.position - b.position).map((exercise) => ({ id: exercise.id, databaseId: exercise.id, name: exercise.name, alternativeAtHome: exercise.home_alternative, sets: exercise.sets, repetitions: exercise.repetitions, restSeconds: exercise.rest_seconds })) })) };
}

function nutritionForPlan(plan: WeeklyPlan): NutritionTargets | undefined {
  if (plan.nutrition) return plan.nutrition;
  if (!plan.assessment) return undefined;
  return generateWeeklyPlan({ name: plan.name, goal: plan.goal, level: plan.level, daysPerWeek: Math.max(2, plan.sessions.length), assessment: plan.assessment }).nutrition;
}

function draftFrom(plan: WeeklyPlan): NutritionDraft {
  const nutrition = nutritionForPlan(plan);
  return { estimatedCalories: nutrition?.estimatedCalories ?? 0, proteinGrams: nutrition?.proteinGrams ?? 0, carbohydrateGrams: nutrition?.carbohydrateGrams ?? 0, fatGrams: nutrition?.fatGrams ?? 0, waterLiters: nutrition?.waterLiters ?? 0,
    strategy: nutrition?.strategy ?? plan.assessment?.nutritionProfile?.strategy ?? "", kitchenResources: nutrition?.kitchenResources ?? plan.assessment?.nutritionProfile?.kitchenResources ?? "",
    accessibleFoods: (nutrition?.accessibleFoods ?? plan.assessment?.nutritionProfile?.accessibleFoods ?? []).join(", "), unavailableFoods: (nutrition?.unavailableFoods ?? plan.assessment?.nutritionProfile?.unavailableFoods ?? []).join(", "),
    recommendations: (nutrition?.recommendations ?? plan.assessment?.nutritionProfile?.recommendations ?? []).join("\n"), week: nutrition ? normalizeNutritionWeek(plan, nutrition) : [] };
}

function activePhase(plan: WeeklyPlan, nutrition: NutritionTargets) {
  const recovery = plan.assessment?.recovery;
  const index = Math.max(0, Math.min(recovery?.activePhaseIndex ?? 0, Math.max(0, (recovery?.phases?.length ?? 1) - 1)));
  const name = recovery?.phases?.[index]?.name ?? (plan.assessment?.planMode === "fitness" ? "Plan activo" : "Fase activa");
  const guidance = nutrition.phaseGuidance?.find((item) => item.phaseName.toLocaleLowerCase() === name.toLocaleLowerCase()) ?? nutrition.phaseGuidance?.[index];
  return { name, guidance };
}

export default function NutritionPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [draft, setDraft] = useState<NutritionDraft | null>(null);
  const [selectedWeekday, setSelectedWeekday] = useState(() => new Date().getDay());
  const [loading, setLoading] = useState(true); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");

  useEffect(() => {
    const requestedDay = Number(new URLSearchParams(window.location.search).get("day"));
    if (Number.isInteger(requestedDay) && requestedDay >= 0 && requestedDay <= 6) void Promise.resolve().then(() => setSelectedWeekday(requestedDay));
    let cancelled = false;
    async function loadPlan() {
      const cachedRaw = window.sessionStorage.getItem("pulso-plan"); let cached: WeeklyPlan | null = null;
      if (cachedRaw) { try { cached = JSON.parse(cachedRaw) as WeeklyPlan; } catch { window.sessionStorage.removeItem("pulso-plan"); } }
      if (cached && !cancelled) { setPlan(cached); setDraft(draftFrom(cached)); setLoading(false); }
      const query = supabase.from("weekly_plans").select(planSelect);
      const result = cached?.databaseId ? await query.eq("id", cached.databaseId).maybeSingle() : await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (result.error) { if (!cached) setError("No pudimos cargar el plan nutricional. Comprueba tu conexión e inténtalo nuevamente."); else setMessage("Estás viendo la última copia guardada en este dispositivo."); }
      else if (result.data) { const stored = mapStoredPlan(result.data as unknown as StoredPlanRow); setPlan(stored); setDraft(draftFrom(stored)); window.sessionStorage.setItem("pulso-plan", JSON.stringify(stored)); }
      setLoading(false);
    }
    void loadPlan(); return () => { cancelled = true; };
  }, [supabase]);

  const nutrition = plan ? nutritionForPlan(plan) : undefined;
  const week = useMemo(() => plan && nutrition ? normalizeNutritionWeek(plan, nutrition) : [], [nutrition, plan]);
  const shownWeek = editing ? draft?.week ?? week : week;
  const selectedDay = shownWeek.find((day) => day.weekday === selectedWeekday) ?? shownWeek[0];
  const phase = plan && nutrition ? activePhase(plan, nutrition) : null;

  function updateMeal(mealIndex: number, field: "name" | "time" | "objective" | "foods" | "preparation", value: string) {
    setDraft((current) => current ? { ...current, week: current.week.map((day) => day.weekday !== selectedWeekday ? day : { ...day, meals: day.meals.map((meal, index) => index !== mealIndex ? meal : { ...meal, [field]: field === "foods" ? splitList(value) : value }) }) } : current);
  }

  async function saveNutrition() {
    if (!plan || !draft || !nutrition || saving) return;
    if (!plan.databaseId) return setError("Este plan todavía no tiene un identificador guardado. Abre Mi plan y vuelve a intentarlo.");
    const accessibleFoods = splitList(draft.accessibleFoods);
    const validWeek = draft.week.length === 7 && draft.week.every((day) => day.meals.length === 3 && day.meals.every((meal) => meal.name.trim() && /^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time) && meal.foods.length));
    if (!draft.strategy.trim() || !draft.kitchenResources.trim() || !accessibleFoods.length || !validWeek) return setError("Completa la estrategia, despensa y las tres comidas con horario de cada día.");
    if ([draft.estimatedCalories, draft.proteinGrams, draft.carbohydrateGrams, draft.fatGrams, draft.waterLiters].some((value) => !Number.isFinite(value) || value <= 0)) return setError("Los objetivos de calorías, macronutrientes y agua deben ser mayores que cero.");
    setSaving(true); setError(""); setMessage("");
    const recommendations = splitList(draft.recommendations); const mealStructure = mealStructureFromWeek(draft.week);
    const nextNutrition: NutritionTargets = { ...nutrition, estimatedCalories: draft.estimatedCalories, proteinGrams: draft.proteinGrams, carbohydrateGrams: draft.carbohydrateGrams, fatGrams: draft.fatGrams, waterLiters: draft.waterLiters, strategy: draft.strategy.trim(), kitchenResources: draft.kitchenResources.trim(), accessibleFoods, unavailableFoods: splitList(draft.unavailableFoods), mealStructure, weeklySchedule: draft.week, recommendations };
    const previous = plan.assessment?.nutritionProfile;
    const nextProfile: NutritionProfile = { status: previous?.status ?? "general_guidance", objective: previous?.objective || plan.goal, currentPattern: previous?.currentPattern ?? "", scheduleAndAccess: previous?.scheduleAndAccess ?? "", accessibleFoods, unavailableFoods: nextNutrition.unavailableFoods ?? [], kitchenResources: nextNutrition.kitchenResources ?? "", strategy: nextNutrition.strategy ?? "", mealStructure, weeklySchedule: draft.week, recommendations, phaseGuidance: previous?.phaseGuidance ?? nextNutrition.phaseGuidance ?? [], professionalReferral: previous?.professionalReferral ?? nextNutrition.professionalReferral ?? "" };
    const nextAssessment = plan.assessment ? { ...plan.assessment, nutritionProfile: nextProfile } : undefined;
    const { error: saveError } = await supabase.from("weekly_plans").update({ nutrition_targets: nextNutrition, ...(nextAssessment ? { assessment_snapshot: nextAssessment } : {}) }).eq("id", plan.databaseId);
    if (saveError) { setError(`No pudimos guardar los cambios: ${saveError.message}`); setSaving(false); return; }
    const nextPlan = { ...plan, nutrition: nextNutrition, assessment: nextAssessment }; setPlan(nextPlan); setDraft(draftFrom(nextPlan)); setEditing(false); setSaving(false); setMessage("Plan semanal actualizado correctamente."); window.sessionStorage.setItem("pulso-plan", JSON.stringify(nextPlan));
  }

  if (loading) return <main className="nutrition-page"><AmbientGymBackground /><p className="nutrition-state"><LoaderCircle className="spin" size={22} /> Preparando tu nutrición…</p></main>;
  if (!plan || !nutrition || !draft) return <main className="nutrition-page"><AmbientGymBackground /><section className="nutrition-empty"><Salad size={34} /><h1>AÚN NO HAY UN PLAN NUTRICIONAL.</h1><p>Crea o mejora un plan para que Pulso IA use tu objetivo, entrenamiento y alimentos disponibles.</p><Link className="button button-primary" href="/plan">Volver a Mi plan</Link></section></main>;

  return <main className="nutrition-page"><AmbientGymBackground />
    <header className="nutrition-header"><Link href="/plan"><ArrowLeft size={18} /> Mi plan</Link><span><Salad size={18} /> Nutrición</span><button type="button" className="button button-quiet" onClick={() => { setEditing((value) => !value); setError(""); setMessage(""); setDraft(draftFrom(plan)); }}><Pencil size={17} /> {editing ? "Cancelar" : "Editar"}</button></header>
    <section className="nutrition-hero" aria-labelledby="nutrition-title"><div><p className="eyebrow">Menú semanal · {phase?.name}</p><h1 id="nutrition-title">COME PARA TU PROCESO.</h1><p>{nutrition.strategy || nutrition.note}</p></div><div className="nutrition-hero-badge"><Dumbbell size={20} /><span><small>Objetivo actual</small><strong>{plan.goal}</strong></span></div></section>
    {message && <p className="nutrition-feedback is-success" role="status"><Check size={18} /> {message}</p>}{error && <p className="nutrition-feedback is-error" role="alert"><CircleAlert size={18} /> {error}</p>}

    {!editing ? <>
      <section className="nutrition-metrics" aria-label="Objetivos nutricionales estimados"><article><strong>{nutrition.estimatedCalories}</strong><span>kcal orientativas</span></article><article><strong>{nutrition.proteinGrams} g</strong><span>proteína</span></article><article><strong>{nutrition.carbohydrateGrams} g</strong><span>carbohidratos</span></article><article><strong>{nutrition.fatGrams} g</strong><span>grasas</span></article><article><Droplets size={20} /><strong>{nutrition.waterLiters} L</strong><span>agua de referencia</span></article></section>
      <section className="nutrition-calendar-panel"><header><div><p className="eyebrow">Calendario semanal</p><h2>ELIGE TU DÍA.</h2></div><CalendarDays size={24} /></header><nav className="nutrition-week-picker" aria-label="Seleccionar día">{NUTRITION_WEEK_DAYS.map((item) => <button type="button" key={item.weekday} aria-pressed={selectedWeekday === item.weekday} onClick={() => setSelectedWeekday(item.weekday)}><span>{item.short}</span><strong>3</strong><small>comidas</small></button>)}</nav></section>
      {selectedDay && <section className="nutrition-day-panel" aria-labelledby="nutrition-day-title"><header><div><p className="eyebrow">{selectedDay.phaseName}</p><h2 id="nutrition-day-title">{selectedDay.day.toLocaleUpperCase()}.</h2><p>{selectedDay.focus}</p></div><span className="nutrition-day-count"><UtensilsCrossed size={17} /> 3 comidas</span></header><div className="nutrition-day-meals">{selectedDay.meals.map((meal, index) => <article key={`${selectedDay.weekday}-${index}`}><div className="nutrition-meal-time"><Clock3 size={16} /><time>{meal.time}</time><span>0{index + 1}</span></div><div><p>{meal.name}</p><h3>{meal.foods.join(" + ")}</h3><small>{meal.objective}</small>{meal.preparation && <p className="nutrition-preparation">{meal.preparation}</p>}</div></article>)}</div></section>}
      <NutritionReminders planId={plan.databaseId} schedule={week} selectedWeekday={selectedWeekday} />
      <details className="nutrition-support-details"><summary><span><Sparkles size={18} /><span><small>Información complementaria</small><strong>Recomendaciones, fase y despensa</strong></span></span><ChevronRight size={18} /></summary><div className="nutrition-support-grid"><section><p className="eyebrow">Ajuste de fase</p><h3>{phase?.name}</h3><p>{phase?.guidance?.focus || "El menú acompaña la carga y tolerancia del plan activo."}</p><ul>{phase?.guidance?.adjustments.map((item) => <li key={item}>{item}</li>)}</ul></section><section><p className="eyebrow">Tu despensa</p><div className="nutrition-food-list">{nutrition.accessibleFoods?.map((food) => <span key={food}>{food}</span>)}</div><p className="nutrition-kitchen"><strong>Preparación:</strong> {nutrition.kitchenResources || "Sin recursos registrados"}</p></section><section><p className="eyebrow">Consejos guardados</p><ul>{nutrition.recommendations?.map((item) => <li key={item}>{item}</li>)}</ul>{nutrition.professionalReferral && <p className="nutrition-professional"><CircleAlert size={17} /> {nutrition.professionalReferral}</p>}</section></div></details>
      <p className="nutrition-education-note">{nutrition.note}</p>
    </> : <section className="nutrition-editor" aria-labelledby="nutrition-editor-title"><header><div><p className="eyebrow">Editar calendario</p><h2 id="nutrition-editor-title">AJUSTA TU SEMANA.</h2></div><button className="button button-primary" type="button" disabled={saving} onClick={() => void saveNutrition()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{saving ? "Guardando…" : "Guardar cambios"}</button></header>
      <div className="nutrition-target-editor"><label>Calorías<input type="number" min="1" value={draft.estimatedCalories} onChange={(event) => setDraft({ ...draft, estimatedCalories: Number(event.target.value) })} /></label><label>Proteína (g)<input type="number" min="1" value={draft.proteinGrams} onChange={(event) => setDraft({ ...draft, proteinGrams: Number(event.target.value) })} /></label><label>Carbohidratos (g)<input type="number" min="1" value={draft.carbohydrateGrams} onChange={(event) => setDraft({ ...draft, carbohydrateGrams: Number(event.target.value) })} /></label><label>Grasas (g)<input type="number" min="1" value={draft.fatGrams} onChange={(event) => setDraft({ ...draft, fatGrams: Number(event.target.value) })} /></label><label>Agua (L)<input type="number" min="0.1" step="0.1" value={draft.waterLiters} onChange={(event) => setDraft({ ...draft, waterLiters: Number(event.target.value) })} /></label></div>
      <div className="nutrition-form-grid"><label className="is-wide">Estrategia general<textarea rows={3} value={draft.strategy} onChange={(event) => setDraft({ ...draft, strategy: event.target.value })} /></label><label>Recursos para cocinar<textarea rows={3} value={draft.kitchenResources} onChange={(event) => setDraft({ ...draft, kitchenResources: event.target.value })} /></label><label>Alimentos disponibles<textarea rows={3} value={draft.accessibleFoods} onChange={(event) => setDraft({ ...draft, accessibleFoods: event.target.value })} /></label><label>Alimentos restringidos<textarea rows={3} value={draft.unavailableFoods} onChange={(event) => setDraft({ ...draft, unavailableFoods: event.target.value })} /></label><label>Recomendaciones<textarea rows={3} value={draft.recommendations} onChange={(event) => setDraft({ ...draft, recommendations: event.target.value })} /></label></div>
      <div className="nutrition-week-editor"><header><div><p className="eyebrow">Tres comidas por día</p><h3>CALENDARIO Y HORARIOS.</h3></div><AlarmClock size={22} /></header><nav className="nutrition-week-picker" aria-label="Día que deseas editar">{NUTRITION_WEEK_DAYS.map((item) => <button type="button" key={item.weekday} aria-pressed={selectedWeekday === item.weekday} onClick={() => setSelectedWeekday(item.weekday)}><span>{item.short}</span><strong>3</strong><small>comidas</small></button>)}</nav>{selectedDay && <div className="nutrition-meal-editor">{selectedDay.meals.map((meal, index) => <article key={`${selectedDay.weekday}-${index}`}><span className="nutrition-editor-meal-number">0{index + 1}</span><label>Comida<input value={meal.name} onChange={(event) => updateMeal(index, "name", event.target.value)} /></label><label>Horario<input type="time" value={meal.time} onChange={(event) => updateMeal(index, "time", event.target.value)} /></label><label className="is-wide">Alimentos<textarea rows={2} value={meal.foods.join("\n")} onChange={(event) => updateMeal(index, "foods", event.target.value)} /><small>Uno por línea o separados por coma.</small></label><label>Objetivo<input value={meal.objective} onChange={(event) => updateMeal(index, "objective", event.target.value)} /></label><label>Preparación<input value={meal.preparation} onChange={(event) => updateMeal(index, "preparation", event.target.value)} /></label></article>)}</div>}</div>
      <div className="nutrition-editor-footer"><button className="button button-quiet" type="button" onClick={() => { setEditing(false); setDraft(draftFrom(plan)); }}>Cancelar</button><button className="button button-primary" type="button" disabled={saving} onClick={() => void saveNutrition()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{saving ? "Guardando…" : "Guardar nutrición"}</button></div>
    </section>}
    <nav className="nutrition-shortcuts"><Link href="/plan">Mi plan <ChevronRight size={16} /></Link><Link href="/evaluacion-asistida" onClick={() => window.sessionStorage.setItem("pulso-chat-revision", JSON.stringify(plan))}>Mejorar con IA <Sparkles size={16} /></Link></nav>
  </main>;
}
