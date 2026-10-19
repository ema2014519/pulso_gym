"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, Clock3, Dumbbell, Pause, Play, Plus, RotateCcw, SkipForward, Trophy } from "lucide-react";
import { AmbientGymBackground } from "../ambient-gym-background";
import type { ExerciseReference } from "@/lib/exercise-media";
import { useExerciseReference } from "@/lib/use-exercise-reference";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { recoveryExercisesForCurrentPhase, sessionForContext, type BiologicalSex, type PlannedSession, type RecoveryExercisePrescription, type WeeklyPlan } from "@/lib/training";

type Phase = "exercise" | "rest" | "complete";
type StoredWorkout = { exerciseIndex: number; setIndex: number; phase: Phase; secondsLeft: number; elapsedSeconds: number; completedSets: number; startedAt: string; restDurations?: Record<number, number> };

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function frameImage(reference: ExerciseReference, stage: "inicio" | "final") {
  if (stage === "inicio" && reference.startImage) return reference.startImage;
  if (stage === "final" && reference.endImage) return reference.endImage;
  return reference.image.replace("/exercises/", "/exercises/frames/").replace(/\.webp$/, `-${stage}.webp`);
}

function numericDose(value: string) {
  return value.match(/\d+/)?.[0] ?? "";
}

function notifyRestFinished() {
  navigator.vibrate?.([180, 100, 180]);
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
  } catch { /* El aviso sonoro es opcional. */ }
}

export default function GuidedWorkoutPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<PlannedSession | null>(null);
  const [planName, setPlanName] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>();
  const [recoveryExercises, setRecoveryExercises] = useState<RecoveryExercisePrescription[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("exercise");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [paused, setPaused] = useState(false);
  const [startedAt, setStartedAt] = useState("");
  const [loadKg, setLoadKg] = useState("");
  const [repetitions, setRepetitions] = useState("");
  const [completedDose, setCompletedDose] = useState("");
  const [effort, setEffort] = useState("7");
  const [pain, setPain] = useState("0");
  const [demoMode, setDemoMode] = useState<"auto" | "start" | "end">("start");
  const [message, setMessage] = useState("");
  const [restDurations, setRestDurations] = useState<Record<number, number>>({});
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  const exercise = session?.exercises[exerciseIndex];
  const recoveryPrescription = exercise ? recoveryExercises.find((item) => item.name.trim().toLocaleLowerCase() === exercise.name.trim().toLocaleLowerCase()) : undefined;
  const { reference, isGenerating: isGeneratingReference } = useExerciseReference(exercise?.name ?? "", biologicalSex, recoveryPrescription?.instructions ?? "");
  const totalSets = session?.exercises.reduce((sum, item) => sum + item.sets, 0) ?? 0;
  const progress = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;
  const storageKey = session ? `pulso-workout-${session.id}` : "";
  const restDuration = exercise ? restDurations[exerciseIndex] ?? exercise.restSeconds ?? 60 : 60;
  const isLastSet = Boolean(session && exercise && setIndex + 1 >= exercise.sets && exerciseIndex + 1 >= session.exercises.length);
  const currentSetNumber = session
    ? session.exercises.slice(0, exerciseIndex).reduce((sum, item) => sum + item.sets, 0) + setIndex
    : 0;
  const isReviewingCompletedSet = phase === "exercise" && currentSetNumber < completedSets;

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const raw = window.sessionStorage.getItem("pulso-plan");
      if (!raw) { setReady(true); return; }
      try {
        const plan = JSON.parse(raw) as WeeklyPlan;
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("session");
        const selected = plan.sessions.find((item) => item.id === requestedId || item.databaseId === requestedId) ?? plan.sessions[0];
        const contextual = params.get("context") === "casa" ? sessionForContext(selected, "casa") : selected;
        setSession(contextual); setPlanName(plan.name); setBiologicalSex(plan.assessment?.biologicalSex); setRecoveryExercises(recoveryExercisesForCurrentPhase(plan.assessment?.recovery));
        const saved = window.localStorage.getItem(`pulso-workout-${selected.id}`);
        if (saved) {
          const state = JSON.parse(saved) as StoredWorkout;
          const nextExerciseIndex = Math.min(state.exerciseIndex, contextual.exercises.length - 1);
          setExerciseIndex(nextExerciseIndex); setSetIndex(state.setIndex); setPhase(state.phase); setSecondsLeft(state.secondsLeft);
          setElapsedSeconds(state.elapsedSeconds); setCompletedSets(state.completedSets); setStartedAt(state.startedAt); setRestDurations(state.restDurations ?? {});
          const nextDose = contextual.exercises[nextExerciseIndex]?.repetitions ?? "";
          setRepetitions(numericDose(nextDose)); setCompletedDose(nextDose);
        } else { const firstDose = contextual.exercises[0]?.repetitions ?? ""; setStartedAt(new Date().toISOString()); setRepetitions(numericDose(firstDose)); setCompletedDose(firstDose); }
      } catch { setMessage("No pudimos abrir la rutina guardada."); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(initialize);
  }, []);

  useEffect(() => {
    if (!ready || !session || paused || phase === "complete") return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
      if (phase === "rest") setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, phase, ready, session]);

  const moveAfterRest = useCallback(() => {
    if (!session || !exercise) return;
    setControlsCollapsed(false);
    if (setIndex + 1 < exercise.sets) { setSetIndex((current) => current + 1); setPhase("exercise"); }
    else if (exerciseIndex + 1 < session.exercises.length) { const nextIndex = exerciseIndex + 1; const nextDose = session.exercises[nextIndex].repetitions; setExerciseIndex(nextIndex); setSetIndex(0); setDemoMode("start"); setRepetitions(numericDose(nextDose)); setCompletedDose(nextDose); setPhase("exercise"); }
    else setPhase("complete");
    setPain("0"); setMessage("");
  }, [exercise, exerciseIndex, session, setIndex]);

  useEffect(() => {
    if (phase !== "rest" || secondsLeft !== 0) return;
    const notification = window.setTimeout(notifyRestFinished, 0);
    return () => window.clearTimeout(notification);
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (!storageKey || !ready) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ exerciseIndex, setIndex, phase, secondsLeft, elapsedSeconds, completedSets, startedAt, restDurations } satisfies StoredWorkout));
  }, [completedSets, elapsedSeconds, exerciseIndex, phase, ready, restDurations, secondsLeft, setIndex, startedAt, storageKey]);

  async function finishSet() {
    if (!exercise || !session) return;
    setControlsCollapsed(false);
    setMessage("");
    if (exercise.id) {
      const payload = { session_exercise_id: exercise.id, set_number: setIndex + 1, repetitions: recoveryPrescription ? null : Number(repetitions) || null, dose_completed: recoveryPrescription ? completedDose.trim() || exercise.repetitions : null, load_kg: loadKg === "" ? null : Number(loadKg), effort: Number(effort), pain: Number(pain) };
      let { error } = await supabase.from("exercise_logs").insert(payload);
      if (error && (error.code === "PGRST204" || /dose_completed/i.test(error.message))) {
        const legacyPayload = { session_exercise_id: payload.session_exercise_id, set_number: payload.set_number, repetitions: payload.repetitions, load_kg: payload.load_kg, effort: payload.effort, pain: payload.pain };
        const legacyResult = await supabase.from("exercise_logs").insert(legacyPayload);
        error = legacyResult.error;
      }
      if (error) setMessage("La serie quedó guardada en este dispositivo, pero no pudo sincronizarse todavía.");
    }
    setCompletedSets((current) => current + 1);
    setSecondsLeft(isLastSet ? 0 : restDuration); setPhase("rest");
  }

  function showSetByNumber(targetSetNumber: number) {
    if (!session || targetSetNumber < 0 || targetSetNumber >= totalSets) return;
    let remaining = targetSetNumber;
    const targetExerciseIndex = session.exercises.findIndex((item) => {
      if (remaining < item.sets) return true;
      remaining -= item.sets;
      return false;
    });
    if (targetExerciseIndex < 0) return;
    const targetExercise = session.exercises[targetExerciseIndex];
    setExerciseIndex(targetExerciseIndex);
    setSetIndex(remaining);
    setRepetitions(numericDose(targetExercise.repetitions)); setCompletedDose(targetExercise.repetitions);
    setDemoMode("start");
    setPhase("exercise");
    setSecondsLeft(0);
    setPain("0");
    setMessage("");
  }

  function goToPreviousSet() {
    const target = phase === "rest" ? completedSets - 1 : currentSetNumber - 1;
    showSetByNumber(target);
  }

  async function goToNextSet() {
    if (phase === "rest") {
      setSecondsLeft(0);
      moveAfterRest();
      return;
    }
    if (isReviewingCompletedSet) {
      const target = currentSetNumber + 1;
      if (target >= totalSets) setPhase("complete");
      else showSetByNumber(target);
      return;
    }
    await finishSet();
  }

  function restartWorkout() {
    if (storageKey) window.localStorage.removeItem(storageKey);
    setExerciseIndex(0); setSetIndex(0); setPhase("exercise"); setSecondsLeft(0); setElapsedSeconds(0); setCompletedSets(0); setPaused(false); setStartedAt(new Date().toISOString()); setRestDurations({}); setControlsCollapsed(false); setCompletedDose(session?.exercises[0]?.repetitions ?? "");
  }

  if (!ready) return <main className="workout-page"><p className="workout-state">Preparando tu rutina…</p></main>;
  if (!session || !exercise) return <main className="workout-page"><AmbientGymBackground /><section className="workout-empty"><Dumbbell size={34} /><h1>NO ENCONTRAMOS LA RUTINA.</h1><p>Regresa a Mi plan y elige la sesión que quieres comenzar.</p><Link className="button button-primary" href="/plan">Ir a Mi plan</Link></section></main>;

  return <main className="workout-page">
    <AmbientGymBackground />
    <header className="workout-header"><Link href="/plan" className="workout-back"><ArrowLeft size={19} /> Guardar y salir</Link><div><span>{planName}</span><strong>{session.day} · {session.focus}</strong></div><button type="button" className="workout-pause" onClick={() => setPaused((current) => !current)} aria-pressed={paused}>{paused ? <Play size={18} /> : <Pause size={18} />} {paused ? "Continuar" : "Pausar"}</button></header>
    <div className="workout-progress" aria-label={`${progress}% de la rutina completada`}><span style={{ width: `${progress}%` }} /></div>
    {phase === "complete" ? <section className="workout-finish" aria-labelledby="finish-title"><span className="finish-icon"><Trophy size={34} /></span><p className="eyebrow">Rutina completada</p><h1 id="finish-title">TRABAJO HECHO.</h1><p>Terminaste {completedSets} series en {formatTime(elapsedSeconds)}. Tu avance queda guardado para revisar en Progreso.</p><div className="finish-stats"><span><strong>{completedSets}</strong> series</span><span><strong>{session.exercises.length}</strong> ejercicios</span><span><strong>{formatTime(elapsedSeconds)}</strong> tiempo</span></div><div className="finish-actions"><Link className="button button-primary" href="/progreso">Ver progreso <ChevronRight size={18} /></Link><button className="button button-quiet" type="button" onClick={restartWorkout}><RotateCcw size={18} /> Repetir rutina</button></div></section> :
    <section className="workout-layout"><article className="workout-exercise"><div className={`workout-image demo-${demoMode} ${demoMode === "auto" ? "allow-motion" : ""}`}><><div className="technique-frame technique-start"><Image src={frameImage(reference, "inicio")} alt={`${exercise.name}: posición inicial`} fill loading="eager" unoptimized={reference.generated} sizes="(max-width: 900px) 100vw, 58vw" /></div><div className="technique-frame technique-end"><Image src={frameImage(reference, "final")} alt={`${exercise.name}: posición final`} fill loading="eager" unoptimized={reference.generated} sizes="(max-width: 900px) 100vw, 58vw" /></div><span className="technique-stage" aria-live="polite">{isGeneratingReference ? "Creando referencia exacta · guía provisional" : demoMode === "start" ? "Posición inicial" : demoMode === "end" ? "Posición final" : "Demostración automática"}</span><div className="technique-controls" role="group" aria-label="Controlar demostración del ejercicio"><button type="button" aria-pressed={demoMode === "auto"} onClick={() => setDemoMode("auto")}><Play size={15} aria-hidden="true" /> Animar</button><button type="button" aria-pressed={demoMode === "start"} onClick={() => setDemoMode("start")}>Inicio</button><button type="button" aria-pressed={demoMode === "end"} onClick={() => setDemoMode("end")}>Final</button></div></></div><div className="workout-exercise-copy"><div className="workout-position"><span>Ejercicio {exerciseIndex + 1} de {session.exercises.length}</span><span>Serie {setIndex + 1} de {exercise.sets}</span></div><h1>{exercise.name}</h1><p className="workout-prescription">{exercise.repetitions} · {restDuration}s de descanso</p></div></article>
    <aside className={`workout-control ${controlsCollapsed ? "is-collapsed" : ""}`} aria-live="polite">
      <button className="workout-sheet-toggle" type="button" aria-expanded={!controlsCollapsed} aria-label={controlsCollapsed ? "Desplegar controles de la serie" : "Compactar controles de la serie"} onClick={() => setControlsCollapsed((current) => !current)}><span><strong>{phase === "rest" ? isLastSet ? "Rutina lista" : `Descanso ${formatTime(secondsLeft)}` : `Serie ${setIndex + 1} de ${exercise.sets}`}</strong><small>{exercise.name}</small></span>{controlsCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={18} />}</button>
      {paused && <div className="workout-paused"><Pause size={24} /><strong>Rutina en pausa</strong><span>El tiempo y el descanso están detenidos.</span></div>}
      <div className="workout-control-scroll">
      {phase === "rest" ? <div className="rest-panel">
        <p className="eyebrow">{isLastSet ? "Todas las series listas" : "Serie completada"}</p>
        <h2>{isLastSet ? "TERMINASTE" : "DESCANSO"}</h2>
        {!isLastSet && <><time>{formatTime(secondsLeft)}</time><div className="rest-ring" style={{ "--rest-progress": `${Math.max(0, (secondsLeft / Math.max(1, restDuration)) * 360)}deg` } as React.CSSProperties}><Clock3 size={26} /></div><p>{secondsLeft > 0 ? "Respira y prepárate para la siguiente serie." : "Descanso terminado. Avanza cuando estés listo."}</p><div className="rest-actions"><button type="button" onClick={() => setSecondsLeft((current) => current + 30)}><Plus size={17} /> 30 s</button><button type="button" onClick={() => setSecondsLeft(0)}>Omitir <SkipForward size={17} /></button></div></>}
        <button className="button button-primary rest-next" type="button" disabled={paused || (!isLastSet && secondsLeft > 0)} onClick={moveAfterRest}>{isLastSet ? "Finalizar rutina" : setIndex + 1 < exercise.sets ? `Siguiente: serie ${setIndex + 2}` : "Siguiente ejercicio"} <ChevronRight size={20} /></button>
      </div> : <><div className="set-heading"><div><p className="eyebrow">Registra esta serie</p><h2>SERIE {setIndex + 1}</h2></div><span>{completedSets}/{totalSets}</span></div><div className="set-fields">{recoveryPrescription ? <label>Dosis completada<input type="text" value={completedDose} onChange={(event) => setCompletedDose(event.target.value)} /></label> : <label>Repeticiones<input inputMode="numeric" type="number" min="0" value={repetitions} onChange={(event) => setRepetitions(event.target.value)} /></label>}<label>Peso (kg)<input inputMode="decimal" type="number" min="0" step="0.5" placeholder="Opcional" value={loadKg} onChange={(event) => setLoadKg(event.target.value)} /></label><label>Esfuerzo<select value={effort} onChange={(event) => setEffort(event.target.value)}>{[1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}/10</option>)}</select></label><label>Dolor<select value={pain} onChange={(event) => setPain(event.target.value)}>{[0,1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}/10</option>)}</select></label><label className="rest-duration-field">Descanso (segundos)<input inputMode="numeric" type="number" min="0" step="1" value={restDuration} onChange={(event) => { const value = Math.max(0, Number(event.target.value) || 0); setRestDurations((current) => ({ ...current, [exerciseIndex]: value })); }} /></label></div>{Number(pain) >= 5 && <div className="pain-alert"><CircleAlert size={19} /><span><strong>Detén este ejercicio.</strong> Evita el movimiento y consulta a un profesional si el dolor persiste.</span></div>}{message && <p className="workout-message" role="status">{message}</p>}<button className="button button-primary complete-set" type="button" disabled={paused || Number(pain) >= 5} onClick={() => void finishSet()}>Completar serie <Check size={19} /></button></>}
      {(reference || recoveryPrescription) && <section className="series-exercise-details" aria-labelledby="series-exercise-details-title"><header><p className="eyebrow">Detalles del ejercicio</p><h3 id="series-exercise-details-title">{exercise.name}</h3></header><div className="exercise-details-stats"><span><small>Series</small><strong>{exercise.sets}</strong></span><span><small>Dosis</small><strong>{exercise.repetitions}</strong></span><span><small>Descanso</small><strong>{restDuration}s</strong></span></div>{recoveryPrescription && <div className="series-exercise-advice"><p className="eyebrow">Indicaciones del plan</p><ul><li><Check size={18} aria-hidden="true" /><span>{recoveryPrescription.instructions}</span></li><li><Check size={18} aria-hidden="true" /><span>Objetivo: {recoveryPrescription.purpose}</span></li></ul></div>}{reference && <div className="series-exercise-advice"><p className="eyebrow">Consejos técnicos</p><ul>{reference.cues.map((cue) => <li key={cue}><Check size={18} aria-hidden="true" /><span>{cue}</span></li>)}</ul></div>}<div className="exercise-details-safety"><p className="eyebrow">Durante la serie</p><h3>Escucha a tu cuerpo</h3><p>{recoveryPrescription ? `Detén este ejercicio si: ${recoveryPrescription.stopIf}` : "Usa un peso que te permita mantener la técnica. Detén el ejercicio si aparece dolor agudo, mareo o una molestia que aumenta con cada repetición."}</p></div></section>}
      </div>
      <nav className="workout-step-nav" aria-label="Navegar entre series">
        <button type="button" aria-label="Volver a la serie anterior" disabled={paused || (phase !== "rest" && currentSetNumber <= 0)} onClick={goToPreviousSet}><ChevronLeft size={23} /></button>
        <div><small>{phase === "rest" ? "Descanso" : "Tiempo"}</small><time>{formatTime(phase === "rest" ? secondsLeft : elapsedSeconds)}</time></div>
        <button className="is-next" type="button" aria-label={phase === "rest" && isLastSet ? "Finalizar rutina" : isReviewingCompletedSet ? "Volver a la serie actual" : "Completar y avanzar"} disabled={paused || (phase === "exercise" && !isReviewingCompletedSet && Number(pain) >= 5)} onClick={() => void goToNextSet()}>{phase === "rest" && isLastSet ? <Check size={22} /> : <ChevronRight size={23} />}</button>
      </nav>
    </aside></section>}
  </main>;
}
