"use client";

import { BookOpen, ChevronRight, HeartPulse, Sparkles, TriangleAlert, X, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import type { WeeklyPlan } from "@/lib/training";
import { getExerciseReference } from "@/lib/exercise-media";
import { WorkoutReminders } from "./workout-reminders";

export type PlanPanel = "recovery" | "reminders" | "methodology";

export function PlanDetailsModal({ panel, plan, onClose, onReference, onRevise }: { panel: PlanPanel; plan: WeeklyPlan; onClose: () => void; onReference: (exercise: string) => void; onRevise: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const recovery = plan.assessment?.recovery;
  const activePhaseIndex = recovery?.activePhaseIndex ?? 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);

  const title = panel === "recovery" ? "Plan de recuperación" : panel === "reminders" ? "Horarios y alertas" : "Método y seguridad";

  return <div className="plan-panel-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="plan-panel-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-panel-title">
      <header className="plan-panel-header"><div><p className="eyebrow">Detalles del plan</p><h2 id="plan-panel-title">{title.toUpperCase()}.</h2></div><button ref={closeRef} type="button" aria-label={`Cerrar ${title}`} onClick={onClose}><X size={21} aria-hidden="true" /></button></header>
      <div className="plan-panel-scroll">
        {panel === "reminders" && <WorkoutReminders key={plan.databaseId ?? plan.createdAt ?? plan.name} planId={plan.databaseId} sessions={plan.sessions} recovery={recovery} />}

        {panel === "methodology" && <div className="plan-methodology-modal">
          <div className="plan-rationale"><span aria-hidden="true"><Zap size={18} /></span><div><strong>Por qué este plan</strong><p>{plan.rationale}</p></div></div>
          <div className="plan-safety-summary"><TriangleAlert size={19} aria-hidden="true" /><div><strong>Regla general de seguridad</strong><p>{plan.safetyNote}</p></div></div>
          {plan.methodology ? <>
            <div className="plan-evidence-rules">
              <article><small>{recovery ? "Frecuencia inicial" : "Volumen inicial"}</small><strong>{plan.methodology.weeklySetTarget}</strong></article>
              <article><small>{recovery ? "Criterio de tolerancia" : "Esfuerzo objetivo"}</small><strong>{plan.methodology.targetEffort}</strong></article>
              <article><small>{recovery ? "Criterio de avance" : "Progresión"}</small><strong>{plan.methodology.progressionRule}</strong></article>
              <article><small>{recovery ? "Estado clínico declarado" : "Recuperación"}</small><strong>{plan.methodology.recoveryAdjustment}</strong></article>
            </div>
            <p className="plan-time-allocation">{plan.methodology.timeAllocation}</p>
            <div className="plan-evidence-sources"><p className="eyebrow">Base científica · {plan.methodology.version}</p>{plan.methodology.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.title}</strong><small>{source.evidenceType} · {source.year}</small></span><ChevronRight size={16} aria-hidden="true" /></a>)}</div>
          </> : <p className="plan-panel-empty">Este plan no incluye todavía una ficha metodológica detallada.</p>}
        </div>}

        {panel === "recovery" && recovery && <section className="recovery-plan-summary" aria-labelledby="recovery-modal-title">
          <header><span aria-hidden="true"><HeartPulse size={21} /></span><div><p className="eyebrow">{plan.assessment?.planMode === "combined" ? "Entrenamiento adaptado" : "Plan de recuperación"}</p><h3 id="recovery-modal-title">RECUPERACIÓN CON CRITERIOS CLAROS.</h3></div><strong>{recovery.phase.replaceAll("_", " ")}</strong></header>
          <div className="recovery-plan-facts"><article><small>Meta funcional</small><p>{recovery.primaryGoal}</p></article><article><small>Zonas consideradas</small><p>{recovery.affectedAreas.join(", ")}</p></article><article><small>Diagnóstico profesional</small><p>{recovery.professionalDiagnosis || "No declarado; el plan no presupone uno"}</p></article><article><small>Autorización clínica</small><p>{recovery.clinicalClearance ? "Confirmada por el usuario" : "No confirmada"}</p></article></div>
          <div className="recovery-plan-guidance"><article><h4>Actividad tolerada</h4><ul>{recovery.toleratedActivities.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Evitar temporalmente</h4><ul>{recovery.avoidActivities.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Autocuidado</h4><ul>{recovery.homeCare.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Avanza cuando</h4><ul>{recovery.progressionCriteria.map((item) => <li key={item}>{item}</li>)}</ul></article></div>
          {(recovery.phases?.length ?? 0) < 2 && <div className="recovery-phase-warning"><TriangleAlert size={19} aria-hidden="true" /><div><strong>Este plan solo contiene la fase inicial.</strong><p>Pulso IA puede añadir las fases posteriores conservando esta versión.</p></div><button className="button button-quiet" type="button" onClick={onRevise}>Completar fases <Sparkles size={17} aria-hidden="true" /></button></div>}
          {(recovery.phases?.length ?? 0) > 0 ? <div className="recovery-phases"><div className="recovery-prescription-heading"><p className="eyebrow">Cronograma estimado de retorno</p><strong>{recovery.phases?.length} fases</strong></div>{recovery.phases?.map((phase, phaseIndex) => <details className="recovery-phase" key={`${phase.name}-${phaseIndex}`} open={phaseIndex === activePhaseIndex}><summary><span>{String(phaseIndex + 1).padStart(2, "0")}</span><div><small>{phaseIndex === activePhaseIndex ? "Fase activa" : "Fase posterior"}</small><strong>{phase.name}</strong><p>{phase.estimatedDuration}</p></div><ChevronRight size={18} aria-hidden="true" /></summary><div className="recovery-phase-body"><p className="recovery-phase-objective"><strong>Objetivo</strong>{phase.objective}</p><div className="recovery-phase-columns"><article><h4>Qué puedes hacer</h4><ul>{phase.gymActivities.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Recomendaciones</h4><ul>{phase.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Evita por ahora</h4><ul>{phase.avoid.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Avanza cuando</h4><ul>{phase.advancementCriteria.map((item) => <li key={item}>{item}</li>)}</ul></article></div>{phase.regressionCriteria.length > 0 && <div className="recovery-phase-regression"><TriangleAlert size={16} aria-hidden="true" /><span><strong>Retrocede o suspende si:</strong> {phase.regressionCriteria.join(" · ")}</span></div>}<div className="recovery-prescription"><div className="recovery-prescription-heading"><p className="eyebrow">Ejercicios de esta fase</p><strong>{phase.exercises.length} ejercicios</strong></div>{phase.exercises.map((exercise, index) => <article key={`${phase.name}-${exercise.name}-${index}`}><div><small>{String(index + 1).padStart(2, "0")}</small><span><strong>{exercise.name}</strong><p>{exercise.purpose}</p></span>{getExerciseReference(exercise.name, plan.assessment?.biologicalSex) && <button className="recovery-technique-button" type="button" onClick={() => onReference(exercise.name)}><BookOpen size={15} aria-hidden="true" /> Ver técnica</button>}</div><dl><div><dt>Series</dt><dd>{exercise.sets}</dd></div><div><dt>Dosis</dt><dd>{exercise.dose}</dd></div><div><dt>Descanso</dt><dd>{exercise.restSeconds} s</dd></div><div><dt>Frecuencia</dt><dd>{exercise.sessionsPerWeek}× semana</dd></div></dl><p className="recovery-exercise-instruction">{exercise.instructions}</p><p className="recovery-exercise-stop"><TriangleAlert size={15} aria-hidden="true" /> Detén este ejercicio si: {exercise.stopIf}</p></article>)}</div></div></details>)}</div> : <p className="plan-panel-empty">La prescripción aún no tiene un cronograma por fases. Mejora el plan con Pulso IA para completarlo.</p>}
          <div className="recovery-stop-rules"><TriangleAlert size={19} aria-hidden="true" /><div><strong>Detén la sesión y reevalúa si aparece:</strong><p>{recovery.stopRules.join(" · ")}</p></div></div>
        </section>}
        {panel === "recovery" && !recovery && <p className="plan-panel-empty">Este plan no contiene un módulo de recuperación.</p>}
      </div>
    </section>
  </div>;
}
