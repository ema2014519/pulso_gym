"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, CircleAlert, Droplets, Dumbbell, LoaderCircle, Pencil, Plus, Salad, Save, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { AmbientGymBackground } from "../ambient-gym-background";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { generateWeeklyPlan, type NutritionMealGuide, type NutritionProfile, type NutritionTargets, type PlanAssessment, type PlannedSession, type WeeklyPlan } from "@/lib/training";

type StoredPlanRow = {
  id: string;
  name: string;
  created_at: string;
  goal: WeeklyPlan["goal"];
  experience_level: WeeklyPlan["level"];
  rationale: string;
  safety_note: string;
  assessment_snapshot: PlanAssessment | null;
  nutrition_targets: NutritionTargets | null;
  methodology: WeeklyPlan["methodology"] | null;
  planned_sessions: Array<{
    id: string;
    day_name: string;
    context: PlannedSession["context"];
    focus: PlannedSession["focus"];
    duration_minutes: number;
    position: number;
    session_exercises: Array<{
      id: string;
      name: string;
      home_alternative: string;
      sets: number;
      repetitions: string;
      rest_seconds: number;
      position: number;
    }>;
  }>;
};

type MealDraft = NutritionMealGuide & { id: string };
type NutritionDraft = {
  estimatedCalories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  waterLiters: number;
  strategy: string;
  kitchenResources: string;
  accessibleFoods: string;
  unavailableFoods: string;
  recommendations: string;
  meals: MealDraft[];
};

const planSelect = "id, name, created_at, goal, experience_level, rationale, safety_note, assessment_snapshot, nutrition_targets, methodology, planned_sessions(id, day_name, context, focus, duration_minutes, position, session_exercises(id, name, home_alternative, sets, repetitions, rest_seconds, position))";

function draftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function splitList(value: string) {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
}

function mapStoredPlan(plan: StoredPlanRow): WeeklyPlan {
  return {
    databaseId: plan.id,
    name: plan.name,
    createdAt: plan.created_at,
    goal: plan.goal,
    level: plan.experience_level,
    rationale: plan.rationale,
    safetyNote: plan.safety_note,
    assessment: plan.assessment_snapshot ?? undefined,
    nutrition: plan.nutrition_targets ?? undefined,
    methodology: plan.methodology ?? undefined,
    sessions: [...(plan.planned_sessions ?? [])].sort((first, second) => first.position - second.position).map((session) => ({
      id: session.id,
      databaseId: session.id,
      day: session.day_name,
      context: session.context,
      focus: session.focus,
      durationMinutes: session.duration_minutes,
      exercises: [...(session.session_exercises ?? [])].sort((first, second) => first.position - second.position).map((exercise) => ({
        id: exercise.id,
        databaseId: exercise.id,
        name: exercise.name,
        alternativeAtHome: exercise.home_alternative,
        sets: exercise.sets,
        repetitions: exercise.repetitions,
        restSeconds: exercise.rest_seconds,
      })),
    })),
  };
}

function nutritionForPlan(plan: WeeklyPlan): NutritionTargets | undefined {
  if (plan.nutrition) return plan.nutrition;
  if (!plan.assessment) return undefined;
  return generateWeeklyPlan({ name: plan.name, goal: plan.goal, level: plan.level, daysPerWeek: Math.max(2, plan.sessions.length), assessment: plan.assessment }).nutrition;
}

function draftFrom(plan: WeeklyPlan): NutritionDraft {
  const nutrition = nutritionForPlan(plan);
  return {
    estimatedCalories: nutrition?.estimatedCalories ?? 0,
    proteinGrams: nutrition?.proteinGrams ?? 0,
    carbohydrateGrams: nutrition?.carbohydrateGrams ?? 0,
    fatGrams: nutrition?.fatGrams ?? 0,
    waterLiters: nutrition?.waterLiters ?? 0,
    strategy: nutrition?.strategy ?? plan.assessment?.nutritionProfile?.strategy ?? "",
    kitchenResources: nutrition?.kitchenResources ?? plan.assessment?.nutritionProfile?.kitchenResources ?? "",
    accessibleFoods: (nutrition?.accessibleFoods ?? plan.assessment?.nutritionProfile?.accessibleFoods ?? []).join(", "),
    unavailableFoods: (nutrition?.unavailableFoods ?? plan.assessment?.nutritionProfile?.unavailableFoods ?? []).join(", "),
    recommendations: (nutrition?.recommendations ?? plan.assessment?.nutritionProfile?.recommendations ?? []).join("\n"),
    meals: (nutrition?.mealStructure ?? plan.assessment?.nutritionProfile?.mealStructure ?? []).map((meal) => ({ ...meal, id: draftId() })),
  };
}

function recommendationsForPlan(plan: WeeklyPlan, nutrition: NutritionTargets) {
  const totalMinutes = plan.sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const recovery = plan.assessment?.recovery;
  const goalGuidance = plan.goal === "Ganar músculo"
    ? "Distribuye las fuentes de proteína y energía entre tus comidas, usando los alimentos que ya tienes disponibles."
    : plan.goal === "Perder grasa"
      ? "Prioriza comidas regulares y saciantes; evita recortes agresivos que reduzcan tu energía para entrenar."
      : "Prioriza una estructura que puedas repetir con regularidad antes de buscar una precisión difícil de sostener.";
  const items = [
    { title: "Semana de entrenamiento", text: `Tu plan reúne ${plan.sessions.length} sesiones y cerca de ${totalMinutes} minutos semanales. Mantén comidas regulares y ajusta las porciones según hambre, energía y evolución.` },
    { title: "Antes y después", text: "En los días de rutina, elige entre tus alimentos disponibles una comida tolerable antes de entrenar y otra que combine fuente de proteína, carbohidrato y vegetales después." },
    { title: "Objetivo del plan", text: goalGuidance },
    { title: "Hidratación", text: `La referencia calculada es ${nutrition.waterLiters} L al día. Ajusta de forma prudente según sed, clima y sudoración; consulta si tienes restricciones médicas de líquidos.` },
  ];
  if (recovery && plan.assessment?.planMode !== "fitness") items.push({ title: "Recuperación", text: "La alimentación acompaña la recuperación, pero no sustituye la valoración ni el tratamiento profesional. Evita atribuir a un alimento la capacidad de curar una lesión." });
  return items;
}

export default function NutritionPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [draft, setDraft] = useState<NutritionDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPlan() {
      const cachedRaw = window.sessionStorage.getItem("pulso-plan");
      let cached: WeeklyPlan | null = null;
      if (cachedRaw) {
        try { cached = JSON.parse(cachedRaw) as WeeklyPlan; } catch { window.sessionStorage.removeItem("pulso-plan"); }
      }
      if (cached && !cancelled) { setPlan(cached); setDraft(draftFrom(cached)); }

      const query = supabase.from("weekly_plans").select(planSelect);
      const result = cached?.databaseId
        ? await query.eq("id", cached.databaseId).maybeSingle()
        : await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (result.error) {
        if (!cached) setError("No pudimos cargar el plan nutricional. Comprueba tu conexión e inténtalo nuevamente.");
        else setMessage("Estás viendo la última copia guardada en este dispositivo.");
      } else if (result.data) {
        const storedPlan = mapStoredPlan(result.data as unknown as StoredPlanRow);
        setPlan(storedPlan); setDraft(draftFrom(storedPlan));
        window.sessionStorage.setItem("pulso-plan", JSON.stringify(storedPlan));
      }
      setLoading(false);
    }
    void loadPlan();
    return () => { cancelled = true; };
  }, [supabase]);

  const nutrition = plan ? nutritionForPlan(plan) : undefined;
  const contextualRecommendations = useMemo(() => plan && nutrition ? recommendationsForPlan(plan, nutrition) : [], [nutrition, plan]);

  function updateMeal(index: number, field: "moment" | "objective" | "options", value: string) {
    setDraft((current) => current ? { ...current, meals: current.meals.map((meal, itemIndex) => itemIndex === index ? { ...meal, [field]: field === "options" ? value.split("\n") : value } : meal) } : current);
  }

  async function saveNutrition() {
    if (!plan || !draft || !nutrition || saving) return;
    if (!plan.databaseId) { setError("Este plan todavía no tiene un identificador guardado. Abre Mi plan y vuelve a intentarlo."); return; }
    const accessibleFoods = splitList(draft.accessibleFoods);
    const meals = draft.meals.map((meal) => ({ moment: meal.moment.trim(), objective: meal.objective.trim(), options: meal.options.map((item) => item.trim()).filter(Boolean) })).filter((meal) => meal.moment && meal.options.length);
    if (!draft.strategy.trim() || !draft.kitchenResources.trim() || accessibleFoods.length === 0 || meals.length === 0) {
      setError("Completa la estrategia, los recursos de cocina, al menos un alimento disponible y una comida con opciones.");
      return;
    }
    if ([draft.estimatedCalories, draft.proteinGrams, draft.carbohydrateGrams, draft.fatGrams, draft.waterLiters].some((value) => !Number.isFinite(value) || value <= 0)) {
      setError("Los objetivos de calorías, macronutrientes y agua deben ser mayores que cero.");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    const recommendations = splitList(draft.recommendations);
    const nextNutrition: NutritionTargets = { ...nutrition, estimatedCalories: draft.estimatedCalories, proteinGrams: draft.proteinGrams, carbohydrateGrams: draft.carbohydrateGrams, fatGrams: draft.fatGrams, waterLiters: draft.waterLiters, strategy: draft.strategy.trim(), kitchenResources: draft.kitchenResources.trim(), accessibleFoods, unavailableFoods: splitList(draft.unavailableFoods), mealStructure: meals, recommendations };
    const previousProfile = plan.assessment?.nutritionProfile;
    const nextProfile: NutritionProfile = {
      status: previousProfile?.status ?? "general_guidance",
      objective: previousProfile?.objective || plan.goal,
      currentPattern: previousProfile?.currentPattern ?? "",
      scheduleAndAccess: previousProfile?.scheduleAndAccess ?? "",
      accessibleFoods,
      unavailableFoods: nextNutrition.unavailableFoods ?? [],
      kitchenResources: nextNutrition.kitchenResources ?? "",
      strategy: nextNutrition.strategy ?? "",
      mealStructure: meals,
      recommendations,
      phaseGuidance: previousProfile?.phaseGuidance ?? nextNutrition.phaseGuidance ?? [],
      professionalReferral: previousProfile?.professionalReferral ?? nextNutrition.professionalReferral ?? "",
    };
    const nextAssessment = plan.assessment ? { ...plan.assessment, nutritionProfile: nextProfile } : undefined;
    const { error: saveError } = await supabase.from("weekly_plans").update({ nutrition_targets: nextNutrition, ...(nextAssessment ? { assessment_snapshot: nextAssessment } : {}) }).eq("id", plan.databaseId);
    if (saveError) { setError(`No pudimos guardar los cambios: ${saveError.message}`); setSaving(false); return; }
    const nextPlan = { ...plan, nutrition: nextNutrition, assessment: nextAssessment };
    setPlan(nextPlan); setDraft(draftFrom(nextPlan)); setEditing(false); setSaving(false); setMessage("Plan nutricional actualizado correctamente.");
    window.sessionStorage.setItem("pulso-plan", JSON.stringify(nextPlan));
  }

  if (loading) return <main className="nutrition-page"><AmbientGymBackground /><p className="nutrition-state"><LoaderCircle className="spin" size={22} /> Preparando tu nutrición…</p></main>;
  if (!plan || !nutrition || !draft) return <main className="nutrition-page"><AmbientGymBackground /><section className="nutrition-empty"><Salad size={34} /><h1>AÚN NO HAY UN PLAN NUTRICIONAL.</h1><p>Crea o mejora un plan para que Pulso IA use tu objetivo, entrenamiento y alimentos disponibles.</p><Link className="button button-primary" href="/plan">Volver a Mi plan</Link></section></main>;

  return <main className="nutrition-page">
    <AmbientGymBackground />
    <header className="nutrition-header"><Link href="/plan"><ArrowLeft size={18} /> Mi plan</Link><span><Salad size={18} /> Nutrición</span><button type="button" className="button button-quiet" onClick={() => { setEditing((current) => !current); setError(""); setMessage(""); setDraft(draftFrom(plan)); }}><Pencil size={17} /> {editing ? "Cancelar" : "Editar"}</button></header>

    <section className="nutrition-hero" aria-labelledby="nutrition-title"><div><p className="eyebrow">Conectado con {plan.name}</p><h1 id="nutrition-title">NUTRICIÓN PARA TU PROCESO.</h1><p>{nutrition.strategy || nutrition.note}</p></div><div className="nutrition-hero-badge"><Dumbbell size={20} /><span><small>Objetivo actual</small><strong>{plan.goal}</strong></span></div></section>

    {message && <p className="nutrition-feedback is-success" role="status"><Check size={18} /> {message}</p>}
    {error && <p className="nutrition-feedback is-error" role="alert"><CircleAlert size={18} /> {error}</p>}

    {!editing ? <>
      <section className="nutrition-metrics" aria-label="Objetivos nutricionales estimados"><article><strong>{nutrition.estimatedCalories}</strong><span>kcal orientativas</span></article><article><strong>{nutrition.proteinGrams} g</strong><span>proteína</span></article><article><strong>{nutrition.carbohydrateGrams} g</strong><span>carbohidratos</span></article><article><strong>{nutrition.fatGrams} g</strong><span>grasas</span></article><article><Droplets size={20} /><strong>{nutrition.waterLiters} L</strong><span>agua de referencia</span></article></section>

      <section className="nutrition-layout"><div className="nutrition-main-column"><section className="nutrition-panel"><header><div><p className="eyebrow">Según tu entrenamiento</p><h2>RECOMENDACIONES DEL PLAN.</h2></div><Sparkles size={24} /></header><div className="nutrition-guidance-grid">{contextualRecommendations.map((item) => <article key={item.title}><strong>{item.title}</strong><p>{item.text}</p></article>)}</div></section>

      <section className="nutrition-panel"><header><div><p className="eyebrow">Estructura flexible</p><h2>TUS COMIDAS.</h2></div><UtensilsCrossed size={24} /></header><div className="nutrition-meals">{nutrition.mealStructure?.map((meal) => <article key={meal.moment}><span>{meal.moment}</span><strong>{meal.objective}</strong><ul>{meal.options.map((option) => <li key={option}>{option}</li>)}</ul></article>)}</div></section></div>

      <aside className="nutrition-side-column"><section className="nutrition-panel"><p className="eyebrow">Alimentos disponibles</p><h2>TU DESPENSA.</h2><div className="nutrition-food-list">{nutrition.accessibleFoods?.map((food) => <span key={food}>{food}</span>)}</div>{(nutrition.unavailableFoods?.length ?? 0) > 0 && <p className="nutrition-avoid"><strong>Evitar o no disponible:</strong> {nutrition.unavailableFoods?.join(" · ")}</p>}<p className="nutrition-kitchen"><strong>Preparación:</strong> {nutrition.kitchenResources || "Sin recursos registrados"}</p></section>
      <section className="nutrition-panel nutrition-practical"><p className="eyebrow">Recomendaciones guardadas</p><ul>{nutrition.recommendations?.map((item) => <li key={item}><Check size={16} /> <span>{item}</span></li>)}</ul>{nutrition.professionalReferral && <p className="nutrition-professional"><CircleAlert size={17} /> {nutrition.professionalReferral}</p>}</section></aside></section>
      <p className="nutrition-education-note">{nutrition.note}</p>
    </> : <section className="nutrition-editor" aria-labelledby="nutrition-editor-title"><header><div><p className="eyebrow">Editar módulo</p><h2 id="nutrition-editor-title">AJUSTA TU NUTRICIÓN.</h2></div><button className="button button-primary" type="button" aria-disabled={saving} onClick={() => void saveNutrition()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{saving ? "Guardando…" : "Guardar cambios"}</button></header>
      <div className="nutrition-target-editor" aria-label="Editar objetivos nutricionales"><label>Calorías<input type="number" min="0" value={draft.estimatedCalories} onChange={(event) => setDraft({ ...draft, estimatedCalories: Number(event.target.value) })} /></label><label>Proteína (g)<input type="number" min="0" value={draft.proteinGrams} onChange={(event) => setDraft({ ...draft, proteinGrams: Number(event.target.value) })} /></label><label>Carbohidratos (g)<input type="number" min="0" value={draft.carbohydrateGrams} onChange={(event) => setDraft({ ...draft, carbohydrateGrams: Number(event.target.value) })} /></label><label>Grasas (g)<input type="number" min="0" value={draft.fatGrams} onChange={(event) => setDraft({ ...draft, fatGrams: Number(event.target.value) })} /></label><label>Agua (L)<input type="number" min="0" step="0.1" value={draft.waterLiters} onChange={(event) => setDraft({ ...draft, waterLiters: Number(event.target.value) })} /></label></div>
      <div className="nutrition-form-grid"><label className="is-wide">Estrategia general<textarea rows={4} value={draft.strategy} onChange={(event) => setDraft({ ...draft, strategy: event.target.value })} /></label><label>Recursos para cocinar<textarea rows={3} value={draft.kitchenResources} onChange={(event) => setDraft({ ...draft, kitchenResources: event.target.value })} /></label><label>Alimentos disponibles<textarea rows={3} value={draft.accessibleFoods} onChange={(event) => setDraft({ ...draft, accessibleFoods: event.target.value })} placeholder="Arroz, pollo, huevos, lentejas…" /><small>Sepáralos con comas o saltos de línea.</small></label><label>Alimentos no disponibles o restringidos<textarea rows={3} value={draft.unavailableFoods} onChange={(event) => setDraft({ ...draft, unavailableFoods: event.target.value })} /></label><label>Recomendaciones personales<textarea rows={5} value={draft.recommendations} onChange={(event) => setDraft({ ...draft, recommendations: event.target.value })} /><small>Una recomendación por línea.</small></label></div>
      <div className="nutrition-meal-editor"><header><div><p className="eyebrow">Estructura diaria</p><h3>COMIDAS Y OPCIONES.</h3></div><button className="button button-quiet" type="button" onClick={() => setDraft({ ...draft, meals: [...draft.meals, { id: draftId(), moment: "", objective: "", options: [] }] })}><Plus size={17} /> Agregar comida</button></header>{draft.meals.map((meal, index) => <article key={meal.id}><div className="nutrition-meal-number"><span>{index + 1}</span><button type="button" aria-label={`Eliminar comida ${index + 1}`} onClick={() => setDraft({ ...draft, meals: draft.meals.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={17} /></button></div><label>Momento<input value={meal.moment} onChange={(event) => updateMeal(index, "moment", event.target.value)} placeholder="Desayuno" /></label><label>Objetivo<input value={meal.objective} onChange={(event) => updateMeal(index, "objective", event.target.value)} placeholder="Energía para comenzar el día" /></label><label className="is-wide">Opciones<textarea rows={4} value={meal.options.join("\n")} onChange={(event) => updateMeal(index, "options", event.target.value)} placeholder="Una opción por línea" /></label></article>)}</div>
      <div className="nutrition-editor-footer"><button className="button button-quiet" type="button" onClick={() => { setEditing(false); setDraft(draftFrom(plan)); }}>Cancelar</button><button className="button button-primary" type="button" aria-disabled={saving} onClick={() => void saveNutrition()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{saving ? "Guardando…" : "Guardar nutrición"}</button></div>
    </section>}
    <nav className="nutrition-shortcuts" aria-label="Accesos del módulo"><Link href="/plan">Mi plan <ChevronRight size={16} /></Link><Link href="/evaluacion-asistida" onClick={() => window.sessionStorage.setItem("pulso-chat-revision", JSON.stringify(plan))}>Mejorar con IA <Sparkles size={16} /></Link></nav>
  </main>;
}
