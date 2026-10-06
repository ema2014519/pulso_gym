"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Dumbbell, House, ShieldCheck, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { generateWeeklyPlan, type ExperienceLevel, type FitnessGoal, type WeeklyPlan } from "@/lib/training";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const steps = ["Objetivo", "Nivel", "Ritmo", "Equipo", "Seguridad"];
const goals: FitnessGoal[] = ["Ganar fuerza", "Ganar músculo", "Perder grasa", "Crear hábito"];
const levels: ExperienceLevel[] = ["Estoy empezando", "Ya entreno a veces", "Entreno con constancia"];

export default function EvaluacionPage() {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<FitnessGoal>(goals[0]);
  const [level, setLevel] = useState<ExperienceLevel>(levels[0]);
  const [days, setDays] = useState("3 días");
  const [homeEquipment, setHomeEquipment] = useState<string[]>(["Peso corporal"]);
  const [accepted, setAccepted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const reduceMotion = useReducedMotion();
  const canContinue = step !== 4 || accepted;
  const toggleEquipment = (item: string) => setHomeEquipment((items) => items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item]);

  const next = async () => {
    if (!canContinue) return;
    if (step === steps.length - 1) {
      setIsSaving(true);
      setSaveError("");
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente para guardar tu evaluación.");

        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          goal,
          experience_level: level,
          days_per_week: Number(days[0]),
          home_equipment: homeEquipment,
          accepted_safety_notice_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (profileError) throw profileError;

        const nextPlan = generateWeeklyPlan({ goal, level, daysPerWeek: Number(days[0]) });
        const { error: planError } = await supabase.rpc("save_weekly_plan", { plan_payload: nextPlan });
        if (planError) throw planError;

        window.sessionStorage.setItem("pulso-plan", JSON.stringify(nextPlan));
        setPlan(nextPlan);
        setComplete(true);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "No pudimos guardar tu evaluación. Inténtalo de nuevo.");
      } finally {
        setIsSaving(false);
      }
    }
    else setStep((current) => current + 1);
  };

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <Link href="/" className="assessment-brand"><span><Dumbbell size={18} /></span> PULSO</Link>
        <p>Paso {Math.min(step + 1, steps.length)} de {steps.length}</p>
      </header>
      <section className="assessment-shell" aria-labelledby="assessment-title">
        <div className="assessment-progress" aria-label={`Progreso: paso ${step + 1} de ${steps.length}`}><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
        <AnimatePresence mode="wait">
          {complete ? (
            <motion.div className="assessment-complete" key="complete" initial={reduceMotion ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }}>
              <span className="complete-icon"><CheckCircle2 size={34} /></span>
              <p className="eyebrow">Evaluación completa</p><h1 id="assessment-title">TU PUNTO DE PARTIDA ESTÁ LISTO.</h1>
              <p>Crearemos tu plan con foco en <strong>{goal.toLowerCase()}</strong>, nivel <strong>{level.toLowerCase()}</strong> y {days.toLowerCase()} disponibles.</p>
              {plan && <div className="plan-preview" aria-label="Resumen de plan generado">{plan.sessions.map((session) => <span key={session.id}>{session.day}: {session.focus}</span>)}</div>}
              <Link href="/" className="button button-primary">Ver mi plan <ChevronRight size={18} /></Link>
            </motion.div>
          ) : (
            <motion.div className="assessment-card" key={step} initial={reduceMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -18 }} transition={{ type: "spring", stiffness: 300, damping: 27 }}>
              <p className="eyebrow">{steps[step]}</p>
              {step === 0 && <><h1 id="assessment-title">¿QUÉ QUIERES CONSEGUIR?</h1><p className="assessment-copy">Elegimos una prioridad. Después podrás cambiarla.</p><div className="selection-grid">{goals.map((item, index) => <button className={`selection-card ${goal === item ? "selected" : ""}`} onClick={() => setGoal(item)} type="button" key={item}><Trophy size={22} /><span>{item}</span><small>Meta {String(index + 1).padStart(2, "0")}</small></button>)}</div></>}
              {step === 1 && <><h1 id="assessment-title">¿CUÁL ES TU NIVEL?</h1><p className="assessment-copy">No hay respuesta incorrecta. Usaremos esto para definir el punto de inicio.</p><div className="selection-list">{levels.map((item) => <button className={`selection-row ${level === item ? "selected" : ""}`} onClick={() => setLevel(item)} type="button" key={item}><Dumbbell size={20} /><span>{item}</span><CheckCircle2 size={19} /></button>)}</div></>}
              {step === 2 && <><h1 id="assessment-title">ARMA TU RITMO.</h1><p className="assessment-copy">¿Cuántos días reales puedes entrenar en una semana normal?</p><div className="selection-grid compact">{["2 días", "3 días", "4 días", "5 días"].map((item) => <button className={`selection-card ${days === item ? "selected" : ""}`} onClick={() => setDays(item)} type="button" key={item}><CalendarDays size={22} /><span>{item}</span><small>por semana</small></button>)}</div></>}
              {step === 3 && <><h1 id="assessment-title">LISTO PARA CUALQUIER LUGAR.</h1><p className="assessment-copy">Selecciona el equipo que tienes en casa. Podrás cambiar una sesión de gimnasio a casa cuando lo necesites.</p><div className="equipment-head"><House size={21} /> Equipo en casa</div><div className="equipment-options">{["Peso corporal", "Bandas", "Mancuernas", "Banco"].map((item) => <label className="equipment-option" key={item}><input type="checkbox" checked={homeEquipment.includes(item)} onChange={() => toggleEquipment(item)} /><span>{item}</span></label>)}</div></>}
              {step === 4 && <><h1 id="assessment-title">ENTRENA CON SEGURIDAD.</h1><div className="safety-box"><ShieldCheck size={26} /><div><strong>Esta app orienta tu entrenamiento; no reemplaza atención médica.</strong><p>Si tienes lesiones, dolor intenso, embarazo o una condición médica, consulta a un profesional antes de entrenar.</p></div></div><label className="consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Entiendo esta información y deseo continuar.</span></label></>}
              {saveError && <p className="assessment-save-error" role="alert">{saveError}</p>}
              <div className="assessment-actions"><button className="back-button" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || isSaving}><ChevronLeft size={18} /> Atrás</button><button className="button button-primary" type="button" onClick={next} disabled={!canContinue || isSaving}>{isSaving ? "Guardando…" : step === 4 ? "Crear mi plan" : "Continuar"} <ChevronRight size={18} /></button></div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
