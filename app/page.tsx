"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  ChartLine,
  ChevronRight,
  CircleCheck,
  Clock3,
  Dumbbell,
  Flame,
  Home,
  MapPinHouse,
  Plus,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateWeeklyPlan, sessionForContext, type ExperienceLevel, type FitnessGoal, type PlannedSession, type WeeklyPlan } from "@/lib/training";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TrainingPlace = "gimnasio" | "casa";
type ProgressLog = { id: string; repetitions: number | null; loadKg: number | null; effort: number | null; pain: number | null; createdAt: string; exerciseName: string };
type ProfileForm = { goal: string; experienceLevel: string; daysPerWeek: string; homeEquipment: string[] };

const navItems = [
  { label: "Inicio", icon: Home },
  { label: "Mi plan", icon: CalendarDays },
  { label: "Registrar", icon: Plus },
  { label: "Progreso", icon: ChartLine },
  { label: "Perfil", icon: UserRound },
];

const days = [
  { day: "Lun", date: "6", status: "active" },
  { day: "Mar", date: "7", status: "rest" },
  { day: "Mié", date: "8", status: "planned" },
  { day: "Jue", date: "9", status: "rest" },
  { day: "Vie", date: "10", status: "planned" },
];

const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function sessionForToday(sessions: PlannedSession[], todayIndex: number) {
  return [...sessions].sort((first, second) => {
    const firstDistance = (weekdays.indexOf(first.day) - todayIndex + 7) % 7;
    const secondDistance = (weekdays.indexOf(second.day) - todayIndex + 7) % 7;
    return firstDistance - secondDistance;
  })[0];
}

function mapStoredPlan(plan: {
  goal: WeeklyPlan["goal"];
  experience_level: WeeklyPlan["level"];
  rationale: string;
  safety_note: string;
  planned_sessions: Array<{
    id: string;
    day_name: string;
    context: "gimnasio" | "casa";
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
}): WeeklyPlan {
  return {
    goal: plan.goal,
    level: plan.experience_level,
    rationale: plan.rationale,
    safetyNote: plan.safety_note,
    sessions: [...(plan.planned_sessions ?? [])]
      .sort((first, second) => first.position - second.position)
      .map((session) => ({
        id: session.id,
        databaseId: session.id,
        day: session.day_name,
        context: session.context,
        focus: session.focus,
        durationMinutes: session.duration_minutes,
        exercises: [...(session.session_exercises ?? [])]
          .sort((first, second) => first.position - second.position)
          .map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            alternativeAtHome: exercise.home_alternative,
            sets: exercise.sets,
            repetitions: exercise.repetitions,
            restSeconds: exercise.rest_seconds,
          })),
      })),
  };
}

export default function HomePage() {
  const router = useRouter();
  const [place, setPlace] = useState<TrainingPlace>("gimnasio");
  const [checkIn, setCheckIn] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<WeeklyPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(true);
  const [planLoadError, setPlanLoadError] = useState("");
  const [planReloadKey, setPlanReloadKey] = useState(0);
  const [activeNav, setActiveNav] = useState("Inicio");
  const [setNumber, setSetNumber] = useState("1");
  const [repetitions, setRepetitions] = useState("10");
  const [loadKg, setLoadKg] = useState("");
  const [effort, setEffort] = useState("7");
  const [pain, setPain] = useState("0");
  const [isLogging, setIsLogging] = useState(false);
  const [logMessage, setLogMessage] = useState("");
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState("");
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [progressLoadError, setProgressLoadError] = useState("");
  const [progressReloadKey, setProgressReloadKey] = useState(0);
  const [profile, setProfile] = useState<ProfileForm>({ goal: "Ganar fuerza", experienceLevel: "Estoy empezando", daysPerWeek: "3", homeEquipment: ["Peso corporal"] });
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 280, damping: 24 };
  useEffect(() => {
    const saved = window.sessionStorage.getItem("pulso-plan");
    let cancelled = false;

    async function loadPlan() {
      setIsPlanLoading(true);
      setPlanLoadError("");
      const { data, error } = await supabase
        .from("weekly_plans")
        .select("goal, experience_level, rationale, safety_note, planned_sessions(id, day_name, context, focus, duration_minutes, position, session_exercises(id, name, home_alternative, sets, repetitions, rest_seconds, position))")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (!error && data) {
        const storedPlan = mapStoredPlan(data);
        window.sessionStorage.setItem("pulso-plan", JSON.stringify(storedPlan));
        setGeneratedPlan(storedPlan);
      } else if (saved) {
        setGeneratedPlan(JSON.parse(saved) as WeeklyPlan);
        if (error) setPlanLoadError("No pudimos actualizar el plan. Estás viendo la última copia disponible.");
      } else if (error) {
        setPlanLoadError("No pudimos cargar tu plan. Comprueba tu conexión y reintenta.");
      }
      setIsPlanLoading(false);
    }

    void loadPlan();
    return () => { cancelled = true; };
  }, [supabase, planReloadKey]);
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("goal, experience_level, days_per_week, home_equipment")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) setProfile({ goal: data.goal, experienceLevel: data.experience_level, daysPerWeek: String(data.days_per_week), homeEquipment: data.home_equipment ?? [] });
      setIsProfileLoading(false);
    }

    void loadProfile();
    return () => { cancelled = true; };
  }, [supabase]);
  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      setIsProgressLoading(true);
      setProgressLoadError("");
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("id, repetitions, load_kg, effort, pain, created_at, session_exercises(name)")
        .order("created_at", { ascending: false })
        .limit(24);
      if (cancelled) return;
      if (error) setProgressLoadError("No pudimos actualizar tu progreso. Inténtalo nuevamente.");
      setProgressLogs((data ?? []).map((log) => ({
        id: log.id,
        repetitions: log.repetitions,
        loadKg: log.load_kg === null ? null : Number(log.load_kg),
        effort: log.effort,
        pain: log.pain,
        createdAt: log.created_at,
        exerciseName: log.session_exercises?.[0]?.name ?? "Ejercicio",
      })));
      setIsProgressLoading(false);
    }

    void loadProgress();
    return () => { cancelled = true; };
  }, [supabase, progressReloadKey]);
  const todayName = weekdays[new Date().getDay()];
  const activePlanSession = generatedPlan?.sessions.length ? sessionForToday(generatedPlan.sessions, new Date().getDay()) : undefined;
  const displayedPlanSession = activePlanSession && place === "casa" ? sessionForContext(activePlanSession, "casa") : activePlanSession;
  const activeExercise = displayedPlanSession?.exercises[selectedExerciseIndex] ?? displayedPlanSession?.exercises[0];

  async function registerSet() {
    if (!activeExercise?.id) {
      setLogMessage("El plan aún se está sincronizando. Actualiza la página e inténtalo de nuevo.");
      return;
    }

    setIsLogging(true);
    setLogMessage("");
    const { error } = await supabase.from("exercise_logs").insert({
      session_exercise_id: activeExercise.id,
      set_number: Number(setNumber),
      repetitions: Number(repetitions),
      load_kg: loadKg === "" ? null : Number(loadKg),
      effort: Number(effort),
      pain: Number(pain),
    });
    setIsLogging(false);

    if (error) {
      setLogMessage(error.message);
      return;
    }

    setLogMessage(`Serie ${setNumber} guardada.`);
    setProgressLogs((current) => [{
      id: crypto.randomUUID(),
      repetitions: Number(repetitions),
      loadKg: loadKg === "" ? null : Number(loadKg),
      effort: Number(effort),
      pain: Number(pain),
      createdAt: new Date().toISOString(),
      exerciseName: activeExercise.name,
    }, ...current]);
    setSetNumber((current) => String(Number(current) + 1));
  }

  async function completeSession() {
    if (activePlanSession?.databaseId) {
      const { error } = await supabase
        .from("planned_sessions")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", activePlanSession.databaseId);
      if (error) {
        setLogMessage(error.message);
        return;
      }
    }
    setSessionDone(true);
  }

  function handleTrainingAction() {
    if (!sessionStarted) {
      setSelectedExerciseIndex(0);
      setSessionStarted(true);
      return;
    }
    void completeSession();
  }

  async function toggleSessionContext(sessionToUpdate: PlannedSession) {
    if (!sessionToUpdate.databaseId) {
      setPlanMessage("Este plan aún se está sincronizando. Actualiza la página e inténtalo de nuevo.");
      return;
    }

    const nextContext = sessionToUpdate.context === "gimnasio" ? "casa" : "gimnasio";
    setUpdatingSessionId(sessionToUpdate.id);
    setPlanMessage("");
    const { error } = await supabase
      .from("planned_sessions")
      .update({ context: nextContext })
      .eq("id", sessionToUpdate.databaseId);
    setUpdatingSessionId(null);

    if (error) {
      setPlanMessage(error.message);
      return;
    }

    setGeneratedPlan((current) => current ? {
      ...current,
      sessions: current.sessions.map((session) => session.id === sessionToUpdate.id ? { ...session, context: nextContext } : session),
    } : current);
    setPlanMessage(`${sessionToUpdate.day}: sesión actualizada para ${nextContext === "casa" ? "casa" : "gimnasio"}.`);
  }

  function toggleProfileEquipment(item: string) {
    setProfile((current) => ({ ...current, homeEquipment: current.homeEquipment.includes(item) ? current.homeEquipment.filter((entry) => entry !== item) : [...current.homeEquipment, item] }));
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    setProfileMessage("");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setIsSavingProfile(false);
      setProfileMessage("Tu sesión expiró. Inicia sesión nuevamente.");
      return;
    }
    const { error } = await supabase.from("profiles").update({
      goal: profile.goal,
      experience_level: profile.experienceLevel,
      days_per_week: Number(profile.daysPerWeek),
      home_equipment: profile.homeEquipment,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    setIsSavingProfile(false);
    setProfileMessage(error ? error.message : "Perfil actualizado.");
  }

  async function regeneratePlan() {
    setIsRegeneratingPlan(true);
    setProfileMessage("");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setIsRegeneratingPlan(false);
      setProfileMessage("Tu sesión expiró. Inicia sesión nuevamente.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").update({
      goal: profile.goal,
      experience_level: profile.experienceLevel,
      days_per_week: Number(profile.daysPerWeek),
      home_equipment: profile.homeEquipment,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (profileError) {
      setIsRegeneratingPlan(false);
      setProfileMessage(profileError.message);
      return;
    }

    const nextPlan = generateWeeklyPlan({ goal: profile.goal as FitnessGoal, level: profile.experienceLevel as ExperienceLevel, daysPerWeek: Number(profile.daysPerWeek) });
    const { error: planError } = await supabase.rpc("save_weekly_plan", { plan_payload: nextPlan });
    setIsRegeneratingPlan(false);
    if (planError) {
      setProfileMessage(planError.message);
      return;
    }

    window.sessionStorage.setItem("pulso-plan", JSON.stringify(nextPlan));
    setProfileMessage("Plan regenerado. Abriendo tu nueva rutina…");
    window.setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 650);
  }

  const session = place === "gimnasio"
    ? {
        location: displayedPlanSession?.context === "casa" ? "En casa" : "Gimnasio",
        icon: Building2,
        duration: `${displayedPlanSession?.durationMinutes ?? 45} min`,
        exercise: displayedPlanSession?.exercises[0]?.name ?? "Sentadilla guiada",
        detail: displayedPlanSession ? `${displayedPlanSession.exercises[0].sets} series · ${displayedPlanSession.exercises[0].repetitions} repeticiones` : "3 series · 8–10 repeticiones",
      }
    : {
        location: "En casa",
        icon: MapPinHouse,
        duration: `${displayedPlanSession?.durationMinutes ?? 30} min`,
        exercise: displayedPlanSession?.exercises[0]?.name ?? "Sentadilla búlgara",
        detail: displayedPlanSession ? `${displayedPlanSession.exercises[0].sets} series · ${displayedPlanSession.exercises[0].repetitions} repeticiones` : "3 series · 10–12 por lado",
      };

  const LocationIcon = session.icon;
  const totalVolume = progressLogs.reduce((total, log) => total + (log.loadKg ?? 0) * (log.repetitions ?? 0), 0);
  const effortLogs = progressLogs.filter((log) => log.effort !== null);
  const averageEffort = effortLogs.length ? effortLogs.reduce((total, log) => total + (log.effort ?? 0), 0) / effortLogs.length : 0;
  const maxPain = progressLogs.reduce((max, log) => Math.max(max, log.pain ?? 0), 0);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Pulso, inicio">
          <span className="brand-mark" aria-hidden="true"><Dumbbell size={20} /></span>
          <span>Pulso</span>
        </a>
        <nav className="side-nav" aria-label="Navegación de entrenamiento">
          {navItems.map(({ label, icon: Icon }) => (
            <motion.button
              className={`nav-item ${activeNav === label ? "is-active" : ""} ${label === "Registrar" ? "nav-action" : ""}`}
              type="button"
              key={label}
              aria-current={activeNav === label ? "page" : undefined}
              onClick={() => setActiveNav(label)}
              whileHover={reduceMotion ? undefined : { y: label === "Registrar" ? -6 : -3, rotateX: 9, scale: 1.03 }}
              whileTap={reduceMotion ? undefined : { y: 2, rotateX: 0, scale: .94 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
            >
              <Icon size={label === "Registrar" ? 23 : 20} aria-hidden="true" />
              <span>{label}</span>
            </motion.button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="dot" aria-hidden="true" />
          Modo rendimiento activo
        </div>
      </aside>

      <section className="content" id="inicio">
        <header className="topbar">
          <div>
            <p className="eyebrow">Lunes · Semana 01</p>
            <h1>Vamos, Ana.</h1>
          </div>
          <button className="icon-button" type="button" aria-label="Ver notificaciones">
            <Bell size={20} aria-hidden="true" />
            <span className="notification-dot" aria-hidden="true" />
          </button>
        </header>

        {planLoadError && <div className="app-alert" role="status"><span>{planLoadError}</span><button className="text-button" type="button" onClick={() => setPlanReloadKey((current) => current + 1)}>Reintentar</button></div>}

        <AnimatePresence>
          {activeNav === "Mi plan" && (
            <motion.section className="plan-view" aria-labelledby="plan-title" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} transition={transition}>
              <div className="plan-view-heading">
                <div><p className="eyebrow">Plan semanal</p><h2 id="plan-title">TU RUTINA, TU LUGAR.</h2><p>Cambia cualquier día a casa sin perder el foco de la sesión.</p></div>
                <button className="button button-quiet" type="button" onClick={() => setActiveNav("Inicio")}>Volver al inicio</button>
              </div>
              {planMessage && <p className="plan-message" role="status">{planMessage}</p>}
              {generatedPlan ? <div className="plan-session-list">{generatedPlan.sessions.map((planSession) => {
                const isHome = planSession.context === "casa";
                const exercises = isHome ? sessionForContext(planSession, "casa").exercises : planSession.exercises;
                return <article className="plan-session-card" key={planSession.id}>
                  <div className="plan-session-top"><div><p className="eyebrow">{planSession.day} · {planSession.durationMinutes} min</p><h3>{planSession.focus}</h3></div><span className={`context-pill ${isHome ? "is-home" : ""}`}>{isHome ? "En casa" : "Gimnasio"}</span></div>
                  <ul>{exercises.map((exercise) => <li key={exercise.name}><span>{exercise.name}</span><small>{exercise.sets} × {exercise.repetitions}</small></li>)}</ul>
                  <button className="text-button" type="button" disabled={updatingSessionId === planSession.id} onClick={() => void toggleSessionContext(planSession)}>{updatingSessionId === planSession.id ? "Actualizando…" : isHome ? "Cambiar a gimnasio" : "Entrenar en casa"} <ChevronRight size={16} aria-hidden="true" /></button>
                </article>;
              })}</div> : <div className="plan-empty"><h3>Aún no hay un plan guardado.</h3><p>Completa tu evaluación para crear una rutina personalizada.</p></div>}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeNav === "Progreso" && (
            <motion.section className="progress-view" aria-labelledby="progress-title" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} transition={transition}>
              <div className="plan-view-heading"><div><p className="eyebrow">Progreso</p><h2 id="progress-title">EL TRABAJO DEJA HUELLA.</h2><p>Resumen de tus últimas series registradas.</p></div><button className="button button-quiet" type="button" onClick={() => setActiveNav("Inicio")}>Volver al inicio</button></div>
              {isProgressLoading ? <p className="progress-state">Cargando tus registros…</p> : progressLoadError ? <div className="plan-empty"><h3>No se pudo cargar el progreso.</h3><p>{progressLoadError}</p><button className="text-button" type="button" onClick={() => setProgressReloadKey((current) => current + 1)}>Reintentar <ChevronRight size={16} aria-hidden="true" /></button></div> : progressLogs.length === 0 ? <div className="plan-empty"><h3>Aún no registraste series.</h3><p>Inicia una sesión y guarda cada serie para ver tu evolución aquí.</p></div> : <>
                <div className="progress-summary">
                  <article><p>Series registradas</p><strong>{progressLogs.length}</strong></article>
                  <article><p>Volumen total</p><strong>{Math.round(totalVolume)} <small>kg</small></strong></article>
                  <article><p>Esfuerzo medio</p><strong>{averageEffort.toFixed(1)}<small>/10</small></strong></article>
                  <article><p>Dolor máximo</p><strong>{maxPain}<small>/10</small></strong></article>
                </div>
                <div className="progress-grid">
                  <article className="progress-card effort-card"><p className="eyebrow">Esfuerzo reciente</p><h3>INTENSIDAD</h3><div className="effort-bars" aria-label="Gráfico de esfuerzo de las últimas series">{progressLogs.slice(0, 8).reverse().map((log) => <span key={log.id} style={{ height: `${Math.max(12, (log.effort ?? 0) * 10)}%` }} title={`${log.exerciseName}: esfuerzo ${log.effort ?? 0} de 10`} />)}</div><p>Escala percibida de esfuerzo de 1 a 10.</p></article>
                  <article className="progress-card"><p className="eyebrow">Últimas series</p><h3>HISTORIAL</h3><div className="progress-log-list">{progressLogs.slice(0, 5).map((log) => <div key={log.id}><span><strong>{log.exerciseName}</strong><small>{new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(new Date(log.createdAt))}</small></span><span>{log.repetitions ?? "—"} reps · {log.loadKg ?? "—"} kg</span><span className={log.pain && log.pain > 3 ? "pain-warning" : ""}>dolor {log.pain ?? 0}/10</span></div>)}</div></article>
                </div>
              </>}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeNav === "Perfil" && (
            <motion.section className="profile-view" aria-labelledby="profile-title" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} transition={transition}>
              <div className="plan-view-heading"><div><p className="eyebrow">Perfil de entrenamiento</p><h2 id="profile-title">AJUSTA TU PLAN A TU VIDA.</h2><p>Estos datos determinan el volumen y las alternativas que verás en tus sesiones.</p></div><button className="button button-quiet" type="button" onClick={() => setActiveNav("Inicio")}>Volver al inicio</button></div>
              {isProfileLoading ? <p className="progress-state">Cargando tu perfil…</p> : <div className="profile-form">
                <label>Objetivo<select value={profile.goal} onChange={(event) => setProfile((current) => ({ ...current, goal: event.target.value }))}>{["Ganar fuerza", "Ganar músculo", "Perder grasa", "Crear hábito"].map((option) => <option key={option}>{option}</option>)}</select></label>
                <label>Nivel<select value={profile.experienceLevel} onChange={(event) => setProfile((current) => ({ ...current, experienceLevel: event.target.value }))}>{["Estoy empezando", "Ya entreno a veces", "Entreno con constancia"].map((option) => <option key={option}>{option}</option>)}</select></label>
                <label>Días por semana<select value={profile.daysPerWeek} onChange={(event) => setProfile((current) => ({ ...current, daysPerWeek: event.target.value }))}>{[2, 3, 4, 5].map((option) => <option key={option} value={option}>{option} días</option>)}</select></label>
                <fieldset><legend>Equipo disponible en casa</legend><div className="profile-equipment">{["Peso corporal", "Bandas", "Mancuernas", "Banco"].map((item) => <label key={item}><input type="checkbox" checked={profile.homeEquipment.includes(item)} onChange={() => toggleProfileEquipment(item)} /> {item}</label>)}</div></fieldset>
                <div className="profile-save"><p role="status">{profileMessage}</p><div><button className="button button-quiet" type="button" disabled={isSavingProfile || isRegeneratingPlan} onClick={() => void regeneratePlan()}>{isRegeneratingPlan ? "Regenerando…" : "Regenerar plan"}</button><button className="button button-primary" type="button" disabled={isSavingProfile || isRegeneratingPlan} onClick={() => void saveProfile()}>{isSavingProfile ? "Guardando…" : "Guardar cambios"}</button></div></div>
              </div>}
            </motion.section>
          )}
        </AnimatePresence>

        {generatedPlan || isPlanLoading ? <motion.section
          className="hero-card"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          aria-labelledby="session-title"
        >
          <div className="hero-copy">
            <span className="session-label"><Flame size={16} aria-hidden="true" /> {activePlanSession?.day ?? todayName} · sesión de hoy</span>
            <h2 id="session-title">{activePlanSession?.focus?.toUpperCase() ?? "LOWER BODY"}<br />POWER</h2>
            <p>Construye fuerza real. Hoy trabajas piernas, estabilidad y potencia.</p>
            <div className="session-meta">
              <span><LocationIcon size={16} aria-hidden="true" /> {session.location}</span>
              <span><Clock3 size={16} aria-hidden="true" /> {session.duration}</span>
            </div>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={handleTrainingAction}>
                {sessionDone ? "Sesión completada" : sessionStarted ? "Completar sesión" : "Entrenar ahora"} {sessionDone ? <CircleCheck size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
              </button>
              <button className="button button-quiet" type="button" onClick={() => setPlace(place === "gimnasio" ? "casa" : "gimnasio")}>
                {place === "gimnasio" ? "Hoy entreno en casa" : "Volver a gimnasio"}
              </button>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="training-grid" />
            <div className="weight-plate plate-one" />
            <div className="weight-plate plate-two" />
            <div className="stat-float">
              <span className="stat-icon"><Zap size={18} /></span>
              <span><strong>7.0</strong> energía hoy</span>
            </div>
          </div>
        </motion.section> : <section className="no-plan-card" aria-labelledby="no-plan-title"><p className="eyebrow">Tu siguiente paso</p><h2 id="no-plan-title">CREA TU PRIMER PLAN.</h2><p>Completa una evaluación breve para recibir sesiones según tu objetivo, tu experiencia y el lugar donde entrenas.</p><a className="button button-primary" href="/evaluacion">Empezar evaluación <ArrowRight size={18} aria-hidden="true" /></a></section>}

        <AnimatePresence>
          {sessionStarted && !sessionDone && (
            <motion.section className="session-log-card" aria-labelledby="log-title" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }} transition={transition}>
              <div>
                <p className="eyebrow">Registrar serie</p>
                <h2 id="log-title">{activeExercise?.name ?? "Primer ejercicio"}</h2>
                <p>{activeExercise ? `${activeExercise.sets} series · ${activeExercise.repetitions} repeticiones objetivo` : "Sincronizando el ejercicio de hoy."}</p>
              </div>
              {displayedPlanSession && <div className="exercise-selector" role="tablist" aria-label="Ejercicios de la sesión">{displayedPlanSession.exercises.map((exercise, index) => <button key={`${exercise.name}-${index}`} type="button" role="tab" aria-selected={selectedExerciseIndex === index} className={selectedExerciseIndex === index ? "is-active" : ""} onClick={() => { setSelectedExerciseIndex(index); setSetNumber("1"); setLogMessage(""); }}>Ej. {index + 1}<span>{exercise.name}</span></button>)}</div>}
              <div className="log-fields">
                <label>Serie<input type="number" min="1" value={setNumber} onChange={(event) => setSetNumber(event.target.value)} /></label>
                <label>Reps<input type="number" min="0" value={repetitions} onChange={(event) => setRepetitions(event.target.value)} /></label>
                <label>Kg<input type="number" min="0" step="0.5" value={loadKg} onChange={(event) => setLoadKg(event.target.value)} placeholder="—" /></label>
                <label>Esfuerzo (1–10)<input type="number" min="1" max="10" value={effort} onChange={(event) => setEffort(event.target.value)} /></label>
                <label>Dolor (0–10)<input type="number" min="0" max="10" value={pain} onChange={(event) => setPain(event.target.value)} /></label>
              </div>
              <div className="log-actions">
                {logMessage && <p role="status">{logMessage}</p>}
                <button className="button button-primary" type="button" disabled={isLogging} onClick={() => void registerSet()}>{isLogging ? "Guardando…" : "Guardar serie"}</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="dashboard-grid" aria-label="Resumen diario">
          <motion.article className="card schedule-card" initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} whileHover={reduceMotion ? undefined : { y: -4 }} transition={{ ...transition, delay: reduceMotion ? 0 : 0.06 }}>
            <div className="card-heading">
              <div>
                <p className="eyebrow">Programa semanal</p>
                <h2>CONSISTENCIA</h2>
              </div>
              <button className="text-button" type="button" onClick={() => setActiveNav("Mi plan")}>Ver plan <ChevronRight size={16} aria-hidden="true" /></button>
            </div>
            <div className="week-row" aria-label="Calendario semanal">
              {days.map(({ day, date, status }) => (
                <div className="day" key={day}>
                  <span>{day}</span>
                  <span className={`day-number ${status}`}>{status === "active" ? <CircleCheck size={18} aria-label="Sesión de hoy" /> : date}</span>
                </div>
              ))}
            </div>
            <p className="supporting-text"><strong>{generatedPlan?.sessions.length ?? 3} sesiones</strong> planificadas · {sessionDone ? "01 completada." : "lista para empezar."}</p>
          </motion.article>

          <motion.article className="card next-card" initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} whileHover={reduceMotion ? undefined : { y: -4 }} transition={{ ...transition, delay: reduceMotion ? 0 : 0.12 }}>
            <p className="eyebrow">En la plataforma</p>
            <h2>{session.exercise}</h2>
            <p>{session.detail}</p>
            <div className="exercise-progress"><span style={{ width: sessionStarted ? "44%" : "12%" }} /></div>
            <button className="text-button" type="button" onClick={() => setSessionStarted(true)}>Ver detalle <ChevronRight size={16} aria-hidden="true" /></button>
          </motion.article>
        </section>

        <section className="lower-grid">
          <article className="card checkin-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Chequeo previo</p>
                <h2>¿CÓMO LLEGAS HOY?</h2>
              </div>
              {checkIn && <span className="status-success"><CircleCheck size={16} aria-hidden="true" /> Registrado</span>}
            </div>
            <p className="supporting-text">Tu respuesta ayuda a adaptar la carga de la próxima sesión.</p>
            <div className="checkin-options" role="group" aria-label="Registrar energía">
              {["Baja", "Normal", "Alta"].map((option) => (
                <button className="choice" type="button" key={option} aria-pressed={checkIn && option === "Normal"} onClick={() => setCheckIn(true)}>{option}</button>
              ))}
            </div>
          </article>

          <article className="card insight-card">
            <span className="insight-icon" aria-hidden="true"><Trophy size={20} /></span>
            <div>
              <p className="eyebrow">Rendimiento</p>
              <h2>EN RITMO</h2>
              <p>Completaste tus repeticiones objetivo. Mantenemos la carga para consolidar técnica.</p>
              <a className="inline-link" href="#proximamente">Ver por qué <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </article>
        </section>

        <AnimatePresence>
          {place === "casa" && (
            <motion.div className="context-notice" role="status" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 4 }} transition={transition}>
              <MapPinHouse size={20} aria-hidden="true" />
              <span><strong>Sesión adaptada para casa.</strong> Conservamos el objetivo de tren inferior usando el equipo disponible.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navItems.map(({ label, icon: Icon }) => (
          <motion.button
            className={`bottom-nav-item ${activeNav === label ? "is-active" : ""} ${label === "Registrar" ? "nav-action" : ""}`}
            type="button"
            key={label}
            aria-current={activeNav === label ? "page" : undefined}
            onClick={() => setActiveNav(label)}
            whileTap={reduceMotion ? undefined : { y: 2, scale: .92 }}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </motion.button>
        ))}
      </nav>
    </main>
  );
}
