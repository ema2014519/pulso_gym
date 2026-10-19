"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChartLine,
  ChevronRight,
  CircleCheck,
  Clock3,
  Dumbbell,
  Flame,
  Home,
  HeartPulse,
  LogOut,
  MapPinHouse,
  Plus,
  Salad,
  Sparkles,
  Trophy,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { generateWeeklyPlan, recoveryExercisesForCurrentPhase, sessionForContext, type ExperienceLevel, type FitnessGoal, type NutritionTargets, type PlanAssessment, type PlanMethodology, type PlannedSession, type WeeklyPlan } from "@/lib/training";
import { getExerciseReference } from "@/lib/exercise-media";
import { useExerciseReference, warmExerciseReferences } from "@/lib/use-exercise-reference";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AmbientGymBackground } from "./ambient-gym-background";
import { WorkoutReminders } from "./workout-reminders";

type TrainingPlace = "gimnasio" | "casa";
type ProgressLog = { id: string; repetitions: number | null; doseCompleted: string | null; loadKg: number | null; effort: number | null; pain: number | null; createdAt: string; exerciseName: string };
type ProfileForm = { displayName: string; goal: string; experienceLevel: string; daysPerWeek: string; homeEquipment: string[] };

const navItems = [
  { label: "Inicio", icon: Home },
  { label: "Mi plan", icon: CalendarDays },
  { label: "Registrar", icon: Plus },
  { label: "Progreso", icon: ChartLine },
  { label: "Perfil", icon: UserRound },
];
const navigationRoutes: Record<string, string> = { Inicio: "/", "Mi plan": "/plan", Registrar: "/registrar", Progreso: "/progreso", Perfil: "/perfil" };
export type AppView = "Inicio" | "Mi plan" | "Registrar" | "Progreso" | "Perfil";

const calendarWeekdays = [
  { short: "Lun", full: "Lunes" },
  { short: "Mar", full: "Martes" },
  { short: "Mi\u00e9", full: "Mi\u00e9rcoles" },
  { short: "Jue", full: "Jueves" },
  { short: "Vie", full: "Viernes" },
  { short: "S\u00e1b", full: "S\u00e1bado" },
  { short: "Dom", full: "Domingo" },
];

function normalizeDay(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function accountNameFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const metadata = user.user_metadata ?? {};
  const storedName = [metadata.display_name, metadata.full_name, metadata.name, metadata.user_name, metadata.preferred_username]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (storedName) return storedName.trim().replace(/\s+/g, " ");
  return (user.email?.split("@")[0] ?? "")
    .replace(/[._-]+/g, " ")
    .replace(/\d+$/g, "")
    .trim()
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"));
}

function greetingNameFromUser(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const firstName = accountNameFromUser(user).split(/\s+/)[0] || "";
  return firstName ? firstName.charAt(0).toLocaleUpperCase("es") + firstName.slice(1).toLocaleLowerCase("es") : "";
}

const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function sessionForToday(sessions: PlannedSession[], todayIndex: number) {
  return [...sessions].sort((first, second) => {
    const firstDistance = (weekdays.indexOf(first.day) - todayIndex + 7) % 7;
    const secondDistance = (weekdays.indexOf(second.day) - todayIndex + 7) % 7;
    return firstDistance - secondDistance;
  })[0];
}

function mapStoredPlan(plan: {
  id: string;
  name: string;
  created_at: string;
  goal: WeeklyPlan["goal"];
  experience_level: WeeklyPlan["level"];
  rationale: string;
  safety_note: string;
  assessment_snapshot: PlanAssessment | null;
  nutrition_targets: NutritionTargets | null;
  methodology?: PlanMethodology | null;
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

export function AppWorkspace({ view }: { view: AppView }) {
  const router = useRouter();
  const [place, setPlace] = useState<TrainingPlace>("gimnasio");
  const [checkIn, setCheckIn] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(view === "Registrar");
  const [generatedPlan, setGeneratedPlan] = useState<WeeklyPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<WeeklyPlan[]>([]);
  const [isPlanLoading, setIsPlanLoading] = useState(true);
  const [planLoadError, setPlanLoadError] = useState("");
  const [planReloadKey, setPlanReloadKey] = useState(0);
  const activeNav = view;
  const [setNumber, setSetNumber] = useState("1");
  const [repetitions, setRepetitions] = useState("10");
  const [doseCompleted, setDoseCompleted] = useState("");
  const [loadKg, setLoadKg] = useState("");
  const [effort, setEffort] = useState("7");
  const [pain, setPain] = useState("0");
  const [isLogging, setIsLogging] = useState(false);
  const [logMessage, setLogMessage] = useState("");
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState("");
  const [planFilter, setPlanFilter] = useState<"todos" | TrainingPlace>("todos");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [referenceExercise, setReferenceExercise] = useState<string | null>(null);
  const [planPendingDeletion, setPlanPendingDeletion] = useState<WeeklyPlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  const [progressLoadError, setProgressLoadError] = useState("");
  const [progressReloadKey, setProgressReloadKey] = useState(0);
  const [profile, setProfile] = useState<ProfileForm>({ displayName: "", goal: "Ganar fuerza", experienceLevel: "Estoy empezando", daysPerWeek: "3", homeEquipment: ["Peso corporal"] });
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userName, setUserName] = useState("");
  const [weekDates, setWeekDates] = useState<string[]>(() => calendarWeekdays.map(() => "\u2014"));
  const [todayPosition, setTodayPosition] = useState<number | null>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const transition = { type: "spring" as const, stiffness: 280, damping: 24 };
  useEffect(() => {
    if (!planPendingDeletion) return;
    deleteCancelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingPlanId) setPlanPendingDeletion(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deletingPlanId, planPendingDeletion]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date();
      const mondayPosition = (today.getDay() + 6) % 7;
      const monday = new Date(today);
      monday.setHours(12, 0, 0, 0);
      monday.setDate(today.getDate() - mondayPosition);
      setWeekDates(calendarWeekdays.map((_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return String(date.getDate());
      }));
      setTodayPosition(mondayPosition);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const saved = window.sessionStorage.getItem("pulso-plan");
    let cancelled = false;

    async function loadPlan() {
      setIsPlanLoading(true);
      setPlanLoadError("");
      let { data, error } = await supabase
        .from("weekly_plans")
        .select("id, name, created_at, goal, experience_level, rationale, safety_note, assessment_snapshot, nutrition_targets, methodology, planned_sessions(id, day_name, context, focus, duration_minutes, position, session_exercises(id, name, home_alternative, sets, repetitions, rest_seconds, position))")
        .order("created_at", { ascending: false });

      if (error) {
        const currentSchemaResult = await supabase
          .from("weekly_plans")
          .select("id, name, created_at, goal, experience_level, rationale, safety_note, assessment_snapshot, nutrition_targets, planned_sessions(id, day_name, context, focus, duration_minutes, position, session_exercises(id, name, home_alternative, sets, repetitions, rest_seconds, position))")
          .order("created_at", { ascending: false });
        data = currentSchemaResult.data?.map((stored) => ({ ...stored, methodology: null })) as typeof data;
        error = currentSchemaResult.error;
      }

      if (error) {
        const legacyResult = await supabase
          .from("weekly_plans")
          .select("id, created_at, goal, experience_level, rationale, safety_note, planned_sessions(id, day_name, context, focus, duration_minutes, position, session_exercises(id, name, home_alternative, sets, repetitions, rest_seconds, position))")
          .order("created_at", { ascending: false });
        data = legacyResult.data?.map((stored) => ({ ...stored, name: `Plan ${stored.goal}`, assessment_snapshot: null, nutrition_targets: null, methodology: null })) as typeof data;
        error = legacyResult.error;
      }

      if (cancelled) return;
      if (!error && data?.length) {
        const plans = data.map((stored) => mapStoredPlan(stored));
        const storedPlan = plans[0];
        setAvailablePlans(plans);
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
    if (!generatedPlan?.assessment?.biologicalSex) return;
    const sessionExercises = generatedPlan.sessions.flatMap((session) => session.exercises.map((exercise) => ({ name: exercise.name })));
    const recoveryExercises = generatedPlan.assessment.recovery?.phases?.flatMap((phase) => phase.exercises.map((exercise) => ({ name: exercise.name, instructions: exercise.instructions })))
      ?? generatedPlan.assessment.recovery?.exercises?.map((exercise) => ({ name: exercise.name, instructions: exercise.instructions }))
      ?? [];
    void warmExerciseReferences([...sessionExercises, ...recoveryExercises], generatedPlan.assessment.biologicalSex);
  }, [generatedPlan]);
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const displayName = accountNameFromUser(user);
      setUserName(greetingNameFromUser(user));
      const { data } = await supabase
        .from("profiles")
        .select("goal, experience_level, days_per_week, home_equipment")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile((current) => data ? { displayName, goal: data.goal, experienceLevel: data.experience_level, daysPerWeek: String(data.days_per_week), homeEquipment: data.home_equipment ?? [] } : { ...current, displayName });
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
      let { data, error } = await supabase
        .from("exercise_logs")
        .select("id, repetitions, dose_completed, load_kg, effort, pain, created_at, session_exercises(name)")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error && (error.code === "PGRST204" || /dose_completed/i.test(error.message))) {
        const legacy = await supabase
          .from("exercise_logs")
          .select("id, repetitions, load_kg, effort, pain, created_at, session_exercises(name)")
          .order("created_at", { ascending: false })
          .limit(24);
        data = legacy.data?.map((item) => ({ ...item, dose_completed: null })) ?? null;
        error = legacy.error;
      }
      if (cancelled) return;
      if (error) setProgressLoadError("No pudimos actualizar tu progreso. Inténtalo nuevamente.");
      setProgressLogs((data ?? []).map((log) => ({
        id: log.id,
        repetitions: log.repetitions,
        doseCompleted: log.dose_completed,
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
  const todayIndex = todayPosition === null ? null : (todayPosition + 1) % 7;
  const todayName = todayIndex === null ? "Hoy" : weekdays[todayIndex];
  const activePlanSession = generatedPlan?.sessions.length && todayIndex !== null ? sessionForToday(generatedPlan.sessions, todayIndex) : undefined;
  const displayedPlanSession = activePlanSession && place === "casa" ? sessionForContext(activePlanSession, "casa") : activePlanSession;
  const activeExercise = displayedPlanSession?.exercises[selectedExerciseIndex] ?? displayedPlanSession?.exercises[0];
  const activeRecoveryPrescription = recoveryExercisesForCurrentPhase(generatedPlan?.assessment?.recovery).find((item) => item.name.trim().toLocaleLowerCase() === activeExercise?.name.trim().toLocaleLowerCase());

  async function registerSet() {
    if (!activeExercise?.id) {
      setLogMessage("El plan aún se está sincronizando. Actualiza la página e inténtalo de nuevo.");
      return;
    }

    setIsLogging(true);
    setLogMessage("");
    const payload = {
      session_exercise_id: activeExercise.id,
      set_number: Number(setNumber),
      repetitions: activeRecoveryPrescription ? null : Number(repetitions) || null,
      dose_completed: activeRecoveryPrescription ? doseCompleted.trim() || activeExercise.repetitions : null,
      load_kg: loadKg === "" ? null : Number(loadKg),
      effort: Number(effort),
      pain: Number(pain),
    };
    let { error } = await supabase.from("exercise_logs").insert(payload);
    if (error && (error.code === "PGRST204" || /dose_completed/i.test(error.message))) {
      const legacyPayload = { session_exercise_id: payload.session_exercise_id, set_number: payload.set_number, repetitions: payload.repetitions, load_kg: payload.load_kg, effort: payload.effort, pain: payload.pain };
      const legacyResult = await supabase.from("exercise_logs").insert(legacyPayload);
      error = legacyResult.error;
    }
    setIsLogging(false);

    if (error) {
      setLogMessage(error.message);
      return;
    }

    setLogMessage(`Serie ${setNumber} guardada.`);
    setProgressLogs((current) => [{
      id: crypto.randomUUID(),
      repetitions: activeRecoveryPrescription ? null : Number(repetitions) || null,
      doseCompleted: activeRecoveryPrescription ? doseCompleted.trim() || activeExercise.repetitions : null,
      loadKg: loadKg === "" ? null : Number(loadKg),
      effort: Number(effort),
      pain: Number(pain),
      createdAt: new Date().toISOString(),
      exerciseName: activeExercise.name,
    }, ...current]);
    setSetNumber((current) => String(Number(current) + 1));
  }

  function handleTrainingAction() {
    if (!activePlanSession) return;
    router.push(`/entrenamiento?session=${encodeURIComponent(activePlanSession.id)}&context=${place}`);
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
    const displayName = profile.displayName.trim().replace(/\s+/g, " ");
    if (displayName.length < 2) {
      setIsSavingProfile(false);
      setProfileMessage("Ingresa un nombre de al menos 2 caracteres.");
      return;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setIsSavingProfile(false);
      setProfileMessage("Tu sesión expiró. Inicia sesión nuevamente.");
      return;
    }
    const { error: nameError } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, display_name: displayName, full_name: displayName },
    });
    if (nameError) {
      setIsSavingProfile(false);
      setProfileMessage(`No pudimos guardar tu nombre: ${nameError.message}`);
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
    if (!error) setUserName(greetingNameFromUser({ email: user.email, user_metadata: { display_name: displayName } }));
    setProfileMessage(error ? error.message : "Perfil actualizado.");
  }

  async function regeneratePlan() {
    if (generatedPlan?.assessment?.recovery) {
      router.push("/evaluacion-asistida");
      return;
    }
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

    const nextPlan = generateWeeklyPlan({ goal: profile.goal as FitnessGoal, level: profile.experienceLevel as ExperienceLevel, daysPerWeek: Number(profile.daysPerWeek), assessment: generatedPlan?.assessment });
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

  function revisePlanWithAI() {
    if (!generatedPlan) return;
    window.sessionStorage.setItem("pulso-chat-revision", JSON.stringify(generatedPlan));
    router.push("/evaluacion-asistida");
  }

  async function signOut() {
    setIsSigningOut(true);
    setProfileMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setProfileMessage(`No pudimos cerrar la sesión: ${error.message}`);
      setIsSigningOut(false);
      return;
    }
    window.sessionStorage.removeItem("pulso-plan");
    router.replace("/login");
    router.refresh();
  }

  async function deleteSelectedPlan() {
    const plan = planPendingDeletion;
    if (!plan || deletingPlanId) return;
    const planKey = plan.databaseId ?? plan.createdAt ?? plan.name;
    setDeletingPlanId(planKey);
    setPlanMessage("");

    if (plan.databaseId) {
      const { error } = await supabase.from("weekly_plans").delete().eq("id", plan.databaseId);
      if (error) {
        setDeletingPlanId(null);
        setPlanMessage(`No pudimos eliminar el plan: ${error.message}`);
        return;
      }
    }

    const remainingPlans = availablePlans.filter((item) => (item.databaseId ?? item.createdAt ?? item.name) !== planKey);
    const deletingActivePlan = (generatedPlan?.databaseId ?? generatedPlan?.createdAt ?? generatedPlan?.name) === planKey;
    setAvailablePlans(remainingPlans);
    setPlanPendingDeletion(null);
    setDeletingPlanId(null);
    setExpandedSessionId(null);

    if (deletingActivePlan) {
      const nextPlan = remainingPlans[0] ?? null;
      setGeneratedPlan(nextPlan);
      if (nextPlan) window.sessionStorage.setItem("pulso-plan", JSON.stringify(nextPlan));
      else window.sessionStorage.removeItem("pulso-plan");
    }

    setPlanMessage(`“${plan.name}” fue eliminado junto con sus sesiones y registros.`);
  }

  const session = place === "gimnasio"
    ? {
        location: displayedPlanSession?.context === "casa" ? "En casa" : "Gimnasio",
        icon: Building2,
        duration: `${displayedPlanSession?.durationMinutes ?? 45} min`,
        exercise: displayedPlanSession?.exercises[0]?.name ?? "Sentadilla guiada",
        detail: displayedPlanSession ? `${displayedPlanSession.exercises[0].sets} series · ${displayedPlanSession.exercises[0].repetitions}` : "3 series · 8–10 repeticiones",
      }
    : {
        location: "En casa",
        icon: MapPinHouse,
        duration: `${displayedPlanSession?.durationMinutes ?? 30} min`,
        exercise: displayedPlanSession?.exercises[0]?.name ?? "Sentadilla búlgara",
        detail: displayedPlanSession ? `${displayedPlanSession.exercises[0].sets} series · ${displayedPlanSession.exercises[0].repetitions}` : "3 series · 10–12 por lado",
      };

  const LocationIcon = session.icon;
  const totalVolume = progressLogs.reduce((total, log) => total + (log.loadKg ?? 0) * (log.repetitions ?? 0), 0);
  const recoveryDoseCount = progressLogs.filter((log) => Boolean(log.doseCompleted)).length;
  const effortLogs = progressLogs.filter((log) => log.effort !== null);
  const averageEffort = effortLogs.length ? effortLogs.reduce((total, log) => total + (log.effort ?? 0), 0) / effortLogs.length : 0;
  const maxPain = progressLogs.reduce((max, log) => Math.max(max, log.pain ?? 0), 0);
  const visiblePlanSessions = generatedPlan?.sessions.filter((plannedSession) => planFilter === "todos" || plannedSession.context === planFilter) ?? [];
  const totalPlanMinutes = generatedPlan?.sessions.reduce((total, plannedSession) => total + plannedSession.durationMinutes, 0) ?? 0;
  const homeSessionCount = generatedPlan?.sessions.filter((plannedSession) => plannedSession.context === "casa").length ?? 0;
  const { reference: activeReference, isGenerating: isGeneratingReference } = useExerciseReference(referenceExercise ?? "", generatedPlan?.assessment?.biologicalSex);

  return (
    <main className="app-shell">
      <AmbientGymBackground />
      {planPendingDeletion && <div className="plan-delete-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingPlanId) setPlanPendingDeletion(null); }}><section className="plan-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="plan-delete-title" aria-describedby="plan-delete-description"><span className="plan-delete-icon" aria-hidden="true"><TriangleAlert size={25} /></span><div><p className="eyebrow">Acción permanente</p><h2 id="plan-delete-title">¿ELIMINAR “{planPendingDeletion.name.toUpperCase()}”?</h2><p id="plan-delete-description">También se eliminarán sus sesiones, ejercicios y registros de series. Esta acción no se puede deshacer.</p></div><div className="plan-delete-actions"><button ref={deleteCancelRef} className="button button-quiet" type="button" disabled={Boolean(deletingPlanId)} onClick={() => setPlanPendingDeletion(null)}>Conservar plan</button><button className="button button-danger" type="button" disabled={Boolean(deletingPlanId)} onClick={() => void deleteSelectedPlan()}>{deletingPlanId ? "Eliminando…" : "Eliminar definitivamente"}<Trash2 size={18} aria-hidden="true" /></button></div></section></div>}
      {referenceExercise && activeReference && <div className="exercise-reference-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReferenceExercise(null); }}><section className="exercise-reference-dialog" role="dialog" aria-modal="true" aria-labelledby="exercise-reference-title"><button className="exercise-reference-close" type="button" aria-label="Cerrar referencia" onClick={() => setReferenceExercise(null)}><X size={21} aria-hidden="true" /></button><div className="exercise-reference-image"><Image src={activeReference.image} alt={activeReference.alt} fill unoptimized={activeReference.generated} sizes="(max-width: 720px) 94vw, 760px" priority /></div><div className="exercise-reference-copy"><p className="eyebrow">{isGeneratingReference ? "Creando referencia exacta · mostrando guía provisional" : activeReference.generated ? "Guía visual generada y revisada · inicio y final" : "Guía visual · inicio y final"}</p><h2 id="exercise-reference-title">{referenceExercise.toUpperCase()}</h2><ul>{activeReference.cues.map((cue) => <li key={cue}><CircleCheck size={17} aria-hidden="true" /> {cue}</li>)}</ul><p className="exercise-reference-note">La imagen es una referencia general. Detén el ejercicio si aparece dolor agudo o inusual.</p></div></section></div>}
      <aside className="sidebar" aria-label="Navegación principal">
        <Link className="brand" href="/" aria-label="Pulso, inicio">
          <span className="brand-mark" aria-hidden="true"><Dumbbell size={20} /></span>
          <span>Pulso</span>
        </Link>
        <nav className="side-nav" aria-label="Navegación de entrenamiento">
          {navItems.map(({ label, icon: Icon }) => (
            <motion.div
              className={`nav-item ${activeNav === label ? "is-active" : ""} ${label === "Registrar" ? "nav-action" : ""}`}
              key={label}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ y: 1, scale: .96 }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
            >
              <Link href={navigationRoutes[label]} aria-current={activeNav === label ? "page" : undefined}>
                <Icon size={label === "Registrar" ? 23 : 20} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </motion.div>
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
            <p className="eyebrow">{todayPosition === null ? "Tu espacio de hoy" : `${calendarWeekdays[todayPosition].full} · Esta semana`}</p>
            <h1>{userName ? `Vamos, ${userName}.` : "Vamos por tu objetivo."}</h1>
          </div>
          <button className="icon-button" type="button" aria-label="Configurar recordatorios" onClick={() => router.push("/plan#recordatorios")}>
            <Bell size={20} aria-hidden="true" />
            <span className="notification-dot" aria-hidden="true" />
          </button>
        </header>

        {planLoadError && <div className="app-alert" role="status"><span>{planLoadError}</span><button className="text-button" type="button" onClick={() => setPlanReloadKey((current) => current + 1)}>Reintentar</button></div>}

        <AnimatePresence>
          {activeNav === "Mi plan" && (
            <motion.section className="plan-view" aria-labelledby="plan-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={transition}>
              <div className="plan-view-heading">
                <div><p className="eyebrow">Mis planes</p><h2 id="plan-title">TU RUTINA, TU LUGAR.</h2><p>Conserva varios planes y elige cuál quieres consultar o utilizar.</p></div>
                <div className="plan-view-actions"><Link className="button button-primary" href="/evaluacion">Crear otro plan <Plus size={18} aria-hidden="true" /></Link>{generatedPlan && <button className="button button-quiet" type="button" onClick={revisePlanWithAI}>Mejorar con IA <Sparkles size={18} aria-hidden="true" /></button>}{generatedPlan && <button className="button button-danger" type="button" onClick={() => setPlanPendingDeletion(generatedPlan)}>Eliminar plan <Trash2 size={18} aria-hidden="true" /></button>}</div>
              </div>
              {generatedPlan && <>
                <div className="plan-library" role="list" aria-label="Planes guardados">{availablePlans.map((savedPlan) => <button role="listitem" type="button" key={savedPlan.databaseId ?? savedPlan.createdAt} className={savedPlan.databaseId === generatedPlan.databaseId ? "is-active" : ""} onClick={() => { setGeneratedPlan(savedPlan); setExpandedSessionId(null); window.sessionStorage.setItem("pulso-plan", JSON.stringify(savedPlan)); }}><span>{savedPlan.name}</span><small>{savedPlan.goal} · {savedPlan.sessions.length} sesiones</small></button>)}</div>
                <div className="plan-overview" aria-label="Resumen del plan">
                  <article><CalendarDays size={20} aria-hidden="true" /><span><strong>{generatedPlan.sessions.length}</strong><small>sesiones</small></span></article>
                  <article><Clock3 size={20} aria-hidden="true" /><span><strong>{totalPlanMinutes}</strong><small>minutos</small></span></article>
                  <article><MapPinHouse size={20} aria-hidden="true" /><span><strong>{homeSessionCount}</strong><small>en casa</small></span></article>
                  <article><Zap size={20} aria-hidden="true" /><span><strong>{generatedPlan.level.replace("Estoy ", "")}</strong><small>nivel actual</small></span></article>
                </div>
                <WorkoutReminders key={generatedPlan.databaseId ?? generatedPlan.createdAt ?? generatedPlan.name} planId={generatedPlan.databaseId} sessions={generatedPlan.sessions} recovery={generatedPlan.assessment?.recovery} />
                <div className="plan-rationale"><span aria-hidden="true"><Zap size={18} /></span><div><strong>Por qué este plan</strong><p>{generatedPlan.rationale}</p></div></div>
                {generatedPlan.assessment?.recovery && generatedPlan.assessment.planMode !== "fitness" && <section className="recovery-plan-summary" aria-labelledby="recovery-plan-title">
                  <header><span aria-hidden="true"><HeartPulse size={21} /></span><div><p className="eyebrow">{generatedPlan.assessment.planMode === "combined" ? "Entrenamiento adaptado" : "Plan de recuperación"}</p><h3 id="recovery-plan-title">RECUPERACIÓN CON CRITERIOS CLAROS.</h3></div><strong>{generatedPlan.assessment.recovery.phase.replaceAll("_", " ")}</strong></header>
                  <div className="recovery-plan-facts"><article><small>Meta funcional</small><p>{generatedPlan.assessment.recovery.primaryGoal}</p></article><article><small>Zonas consideradas</small><p>{generatedPlan.assessment.recovery.affectedAreas.join(", ")}</p></article><article><small>Diagnóstico profesional</small><p>{generatedPlan.assessment.recovery.professionalDiagnosis || "No declarado; el plan no presupone uno"}</p></article><article><small>Autorización clínica</small><p>{generatedPlan.assessment.recovery.clinicalClearance ? "Confirmada por el usuario" : "No confirmada"}</p></article></div>
                  <div className="recovery-plan-guidance"><article><h4>Actividad tolerada</h4><ul>{generatedPlan.assessment.recovery.toleratedActivities.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Evitar temporalmente</h4><ul>{generatedPlan.assessment.recovery.avoidActivities.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Autocuidado</h4><ul>{generatedPlan.assessment.recovery.homeCare.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Avanza cuando</h4><ul>{generatedPlan.assessment.recovery.progressionCriteria.map((item) => <li key={item}>{item}</li>)}</ul></article></div>
                  {(generatedPlan.assessment.recovery.phases?.length ?? 0) < 2 && <div className="recovery-phase-warning"><TriangleAlert size={19} aria-hidden="true" /><div><strong>Este plan solo contiene la fase inicial.</strong><p>Fue creado antes de exigir un cronograma completo. Pulso IA puede añadir las fases posteriores conservando esta versión.</p></div><button className="button button-quiet" type="button" onClick={revisePlanWithAI}>Completar fases <Sparkles size={17} aria-hidden="true" /></button></div>}
                  {(generatedPlan.assessment.recovery.phases?.length ?? 0) > 0 ? <div className="recovery-phases"><div className="recovery-prescription-heading"><p className="eyebrow">Cronograma estimado de retorno</p><strong>{generatedPlan.assessment.recovery.phases?.length} fases</strong></div>{generatedPlan.assessment.recovery.phases?.map((phase, phaseIndex) => <details className="recovery-phase" key={`${phase.name}-${phaseIndex}`} open><summary><span>{String(phaseIndex + 1).padStart(2, "0")}</span><div><small>{phaseIndex === (generatedPlan.assessment?.recovery?.activePhaseIndex ?? 0) ? "Fase activa" : "Fase posterior"}</small><strong>{phase.name}</strong><p>{phase.estimatedDuration}</p></div><ChevronRight size={18} aria-hidden="true" /></summary><div className="recovery-phase-body"><p className="recovery-phase-objective"><strong>Objetivo</strong>{phase.objective}</p><div className="recovery-phase-columns"><article><h4>Qué puedes hacer</h4><ul>{phase.gymActivities.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Recomendaciones</h4><ul>{phase.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Evita por ahora</h4><ul>{phase.avoid.map((item) => <li key={item}>{item}</li>)}</ul></article><article><h4>Avanza cuando</h4><ul>{phase.advancementCriteria.map((item) => <li key={item}>{item}</li>)}</ul></article></div>{phase.regressionCriteria.length > 0 && <div className="recovery-phase-regression"><TriangleAlert size={16} aria-hidden="true" /><span><strong>Retrocede o suspende si:</strong> {phase.regressionCriteria.join(" · ")}</span></div>}<div className="recovery-prescription"><div className="recovery-prescription-heading"><p className="eyebrow">Ejercicios de esta fase</p><strong>{phase.exercises.length} ejercicios</strong></div>{phase.exercises.map((exercise, index) => <article key={`${phase.name}-${exercise.name}-${index}`}><div><small>{String(index + 1).padStart(2, "0")}</small><span><strong>{exercise.name}</strong><p>{exercise.purpose}</p></span>{getExerciseReference(exercise.name, generatedPlan.assessment?.biologicalSex) && <button className="recovery-technique-button" type="button" onClick={() => setReferenceExercise(exercise.name)}><BookOpen size={15} aria-hidden="true" /> Ver técnica</button>}</div><dl><div><dt>Series</dt><dd>{exercise.sets}</dd></div><div><dt>Dosis</dt><dd>{exercise.dose}</dd></div><div><dt>Descanso</dt><dd>{exercise.restSeconds} s</dd></div><div><dt>Frecuencia</dt><dd>{exercise.sessionsPerWeek}× semana</dd></div></dl><p className="recovery-exercise-instruction">{exercise.instructions}</p><p className="recovery-exercise-stop"><TriangleAlert size={15} aria-hidden="true" /> Detén este ejercicio si: {exercise.stopIf}</p></article>)}</div></div></details>)}</div> : (generatedPlan.assessment.recovery.exercises?.length ?? 0) > 0 && <div className="recovery-prescription"><div className="recovery-prescription-heading"><p className="eyebrow">Prescripción generada desde el chat</p><strong>{generatedPlan.assessment.recovery.exercises?.length ?? 0} ejercicios</strong></div>{(generatedPlan.assessment.recovery.exercises ?? []).map((exercise, index) => <article key={`${exercise.name}-${index}`}><div><small>{String(index + 1).padStart(2, "0")}</small><span><strong>{exercise.name}</strong><p>{exercise.purpose}</p></span>{getExerciseReference(exercise.name, generatedPlan.assessment?.biologicalSex) && <button className="recovery-technique-button" type="button" onClick={() => setReferenceExercise(exercise.name)}><BookOpen size={15} aria-hidden="true" /> Ver técnica</button>}</div><dl><div><dt>Series</dt><dd>{exercise.sets}</dd></div><div><dt>Dosis</dt><dd>{exercise.dose}</dd></div><div><dt>Descanso</dt><dd>{exercise.restSeconds} s</dd></div><div><dt>Frecuencia</dt><dd>{exercise.sessionsPerWeek}× semana</dd></div></dl><p className="recovery-exercise-instruction">{exercise.instructions}</p><p className="recovery-exercise-stop"><TriangleAlert size={15} aria-hidden="true" /> Detén este ejercicio si: {exercise.stopIf}</p></article>)}</div>}
                  <div className="recovery-stop-rules"><TriangleAlert size={19} aria-hidden="true" /><div><strong>Detén la sesión y reevalúa si aparece:</strong><p>{generatedPlan.assessment.recovery.stopRules.join(" · ")}</p></div></div>
                </section>}
                {generatedPlan.methodology && <details className="plan-evidence">
                  <summary><span><BookOpen size={18} aria-hidden="true" /> Cómo se calculó este plan</span><ChevronRight size={18} aria-hidden="true" /></summary>
                  <div className="plan-evidence-content">
                    <div className="plan-evidence-rules">
                      <article><small>{generatedPlan.assessment?.recovery ? "Frecuencia inicial" : "Volumen inicial"}</small><strong>{generatedPlan.methodology.weeklySetTarget}</strong></article>
                      <article><small>{generatedPlan.assessment?.recovery ? "Criterio de tolerancia" : "Esfuerzo objetivo"}</small><strong>{generatedPlan.methodology.targetEffort}</strong></article>
                      <article><small>{generatedPlan.assessment?.recovery ? "Criterio de avance" : "Progresión"}</small><strong>{generatedPlan.methodology.progressionRule}</strong></article>
                      <article><small>{generatedPlan.assessment?.recovery ? "Estado clínico declarado" : "Recuperación"}</small><strong>{generatedPlan.methodology.recoveryAdjustment}</strong></article>
                    </div>
                    <p className="plan-time-allocation">{generatedPlan.methodology.timeAllocation}</p>
                    <div className="plan-evidence-sources"><p className="eyebrow">Base científica · {generatedPlan.methodology.version}</p>{generatedPlan.methodology.sources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.title}</strong><small>{source.evidenceType} · {source.year}</small></span><ChevronRight size={16} aria-hidden="true" /></a>)}</div>
                  </div>
                </details>}
                {generatedPlan.nutrition && <section className="plan-nutrition"><div><p className="eyebrow">Estrategia alimentaria orientativa</p><h3>COMBUSTIBLE PARA TU PLAN.</h3><p>{generatedPlan.nutrition.strategy || generatedPlan.nutrition.note}</p></div><div className="nutrition-target-grid"><span><strong>{generatedPlan.nutrition.estimatedCalories}</strong><small>kcal</small></span><span><strong>{generatedPlan.nutrition.proteinGrams} g</strong><small>proteína</small></span><span><strong>{generatedPlan.nutrition.carbohydrateGrams} g</strong><small>carbohidratos</small></span><span><strong>{generatedPlan.nutrition.fatGrams} g</strong><small>grasas</small></span><span><strong>{generatedPlan.nutrition.waterLiters} L</strong><small>agua</small></span></div>{((generatedPlan.nutrition.mealStructure?.length ?? 0) > 0 || (generatedPlan.nutrition.recommendations?.length ?? 0) > 0) && <details className="nutrition-plan-details"><summary><span><Salad size={18} aria-hidden="true" /> Ver estructura y recomendaciones</span><ChevronRight size={18} aria-hidden="true" /></summary><div className="nutrition-plan-content"><div className="nutrition-meal-grid">{generatedPlan.nutrition.mealStructure?.map((meal) => <article key={meal.moment}><small>{meal.moment}</small><strong>{meal.objective}</strong><ul>{meal.options.map((option) => <li key={option}>{option}</li>)}</ul></article>)}</div>{(generatedPlan.nutrition.recommendations?.length ?? 0) > 0 && <article className="nutrition-recommendations"><h4>Recomendaciones prácticas</h4><ul>{generatedPlan.nutrition.recommendations?.map((item) => <li key={item}>{item}</li>)}</ul></article>}{generatedPlan.nutrition.phaseGuidance?.map((phase) => <article className="nutrition-phase-guidance" key={phase.phaseName}><div><small>Ajuste por fase</small><strong>{phase.phaseName}</strong><p>{phase.focus}</p></div><ul>{phase.adjustments.map((item) => <li key={item}>{item}</li>)}</ul></article>)}{generatedPlan.nutrition.professionalReferral && <p className="nutrition-referral"><TriangleAlert size={16} aria-hidden="true" /> {generatedPlan.nutrition.professionalReferral}</p>}<p className="nutrition-plan-note">{generatedPlan.nutrition.note}</p></div></details>}</section>}
                {(generatedPlan.nutrition?.accessibleFoods?.length ?? 0) > 0 && <section className="nutrition-access"><div><p className="eyebrow">Base alimentaria disponible</p><h3>EL PLAN USA LO QUE TIENES.</h3><p>{generatedPlan.nutrition?.kitchenResources}</p></div><div className="nutrition-food-chips" aria-label="Alimentos disponibles">{generatedPlan.nutrition?.accessibleFoods?.map((food) => <span key={food}>{food}</span>)}</div>{(generatedPlan.nutrition?.unavailableFoods?.length ?? 0) > 0 && <p className="nutrition-unavailable"><strong>No utilizar:</strong> {generatedPlan.nutrition?.unavailableFoods?.join(" · ")}</p>}</section>}
                <div className="plan-toolbar">
                  <div><p className="eyebrow">Filtrar sesiones</p><div className="plan-filters" role="group" aria-label="Filtrar sesiones por lugar">{(["todos", "gimnasio", "casa"] as const).map((filter) => <button type="button" key={filter} className={planFilter === filter ? "is-active" : ""} aria-pressed={planFilter === filter} onClick={() => setPlanFilter(filter)}>{filter === "todos" ? "Todas" : filter === "gimnasio" ? "Gimnasio" : "En casa"}</button>)}</div></div>
                  <p><strong>{visiblePlanSessions.length}</strong> visibles</p>
                </div>
              </>}
              {planMessage && <p className="plan-message" role="status">{planMessage}</p>}
              {generatedPlan ? <div className="plan-session-list">{visiblePlanSessions.map((planSession, index) => {
                const isHome = planSession.context === "casa";
                const exercises = isHome ? sessionForContext(planSession, "casa").exercises : planSession.exercises;
                const isExpanded = expandedSessionId === planSession.id;
                return <article className={`plan-session-card ${isExpanded ? "is-expanded" : ""}`} key={planSession.id}>
                  <div className="plan-session-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
                  <div className="plan-session-top"><div><p className="eyebrow">{planSession.day} · {planSession.durationMinutes} min</p><h3>{planSession.focus}</h3><p className="plan-session-meta">{exercises.length} ejercicios · {exercises.reduce((total, exercise) => total + exercise.sets, 0)} series</p></div><span className={`context-pill ${isHome ? "is-home" : ""}`}>{isHome ? "En casa" : "Gimnasio"}</span></div>
                  {isExpanded && <ul>{exercises.map((exercise, exerciseIndex) => <li key={`${exercise.name}-${exerciseIndex}`}><span><small>{String(exerciseIndex + 1).padStart(2, "0")}</small>{exercise.name}</span><span className="exercise-row-actions"><strong>{exercise.sets} × {exercise.repetitions} · {exercise.restSeconds}s descanso</strong>{getExerciseReference(exercise.name, generatedPlan.assessment?.biologicalSex) && <button type="button" aria-label={`Ver referencia de ${exercise.name}`} onClick={() => setReferenceExercise(exercise.name)}><BookOpen size={16} aria-hidden="true" /> Ver técnica</button>}</span></li>)}</ul>}
                  <div className="plan-session-actions">
                    <button className="plan-detail-button" type="button" aria-expanded={isExpanded} onClick={() => setExpandedSessionId(isExpanded ? null : planSession.id)}>{isExpanded ? "Ocultar ejercicios" : `Ver ejercicios (${exercises.length})`}</button>
                    <Link className="button button-primary plan-start-button" href={`/entrenamiento?session=${encodeURIComponent(planSession.id)}&context=${isHome ? "casa" : "gimnasio"}`}>Iniciar rutina <ArrowRight size={17} aria-hidden="true" /></Link>
                    <button className="text-button" type="button" disabled={updatingSessionId === planSession.id} onClick={() => void toggleSessionContext(planSession)}>{updatingSessionId === planSession.id ? "Actualizando…" : isHome ? "Cambiar a gimnasio" : "Entrenar en casa"} <ChevronRight size={16} aria-hidden="true" /></button>
                  </div>
                </article>;
              })}{visiblePlanSessions.length === 0 && <div className="plan-empty"><h3>No hay sesiones con este filtro.</h3><p>Cambia el filtro o adapta una sesión a este lugar.</p></div>}</div> : <div className="plan-empty"><h3>Aún no hay un plan guardado.</h3><p>Completa tu evaluación para crear una rutina personalizada.</p></div>}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeNav === "Progreso" && (
            <motion.section className="progress-view" aria-labelledby="progress-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={transition}>
              <div className="plan-view-heading"><div><p className="eyebrow">Progreso</p><h2 id="progress-title">EL TRABAJO DEJA HUELLA.</h2><p>{generatedPlan?.assessment?.recovery ? "Revisa dosis completadas, esfuerzo y respuesta de dolor durante tu recuperación." : "Resumen de tus últimas series registradas."}</p></div><button className="button button-quiet" type="button" onClick={() => router.push("/")}>Volver al inicio</button></div>
              {isProgressLoading ? <p className="progress-state">Cargando tus registros…</p> : progressLoadError ? <div className="plan-empty"><h3>No se pudo cargar el progreso.</h3><p>{progressLoadError}</p><button className="text-button" type="button" onClick={() => setProgressReloadKey((current) => current + 1)}>Reintentar <ChevronRight size={16} aria-hidden="true" /></button></div> : progressLogs.length === 0 ? <div className="plan-empty"><h3>Aún no registraste series.</h3><p>Inicia una sesión y guarda cada serie para ver tu evolución aquí.</p></div> : <>
                <div className="progress-summary">
                  <article><p>Series registradas</p><strong>{progressLogs.length}</strong></article>
                  <article><p>{generatedPlan?.assessment?.recovery ? "Dosis completadas" : "Volumen total"}</p><strong>{generatedPlan?.assessment?.recovery ? recoveryDoseCount : Math.round(totalVolume)} {!generatedPlan?.assessment?.recovery && <small>kg</small>}</strong></article>
                  <article><p>Esfuerzo medio</p><strong>{averageEffort.toFixed(1)}<small>/10</small></strong></article>
                  <article><p>Dolor máximo</p><strong>{maxPain}<small>/10</small></strong></article>
                </div>
                <div className="progress-grid">
                  <article className="progress-card effort-card"><p className="eyebrow">Esfuerzo reciente</p><h3>INTENSIDAD</h3><div className="effort-bars" aria-label="Gráfico de esfuerzo de las últimas series">{progressLogs.slice(0, 8).reverse().map((log) => <span key={log.id} style={{ height: `${Math.max(12, (log.effort ?? 0) * 10)}%` }} title={`${log.exerciseName}: esfuerzo ${log.effort ?? 0} de 10`} />)}</div><p>Escala percibida de esfuerzo de 1 a 10.</p></article>
                  <article className="progress-card"><p className="eyebrow">Últimas series</p><h3>HISTORIAL</h3><div className="progress-log-list">{progressLogs.slice(0, 5).map((log) => <div key={log.id}><span><strong>{log.exerciseName}</strong><small>{new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(new Date(log.createdAt))}</small></span><span>{log.doseCompleted || `${log.repetitions ?? "—"} reps`}{log.loadKg !== null ? ` · ${log.loadKg} kg` : ""}</span><span className={log.pain && log.pain > 3 ? "pain-warning" : ""}>dolor {log.pain ?? 0}/10</span></div>)}</div></article>
                </div>
              </>}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeNav === "Perfil" && (
            <motion.section className="profile-view" aria-labelledby="profile-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={transition}>
              <div className="plan-view-heading"><div><p className="eyebrow">Perfil personal</p><h2 id="profile-title">AJUSTA TU PLAN A TU VIDA.</h2><p>{generatedPlan?.assessment?.recovery ? "Los cambios de recuperación deben revisarse mediante el chat para actualizar síntomas, fase y dosis." : "Estos datos determinan el volumen y las alternativas que verás en tus sesiones."}</p></div><button className="button button-quiet" type="button" onClick={() => router.push("/")}>Volver al inicio</button></div>
              {generatedPlan?.assessment?.recovery && <div className="plan-rationale"><span aria-hidden="true"><HeartPulse size={18} /></span><div><strong>Perfil de recuperación activo</strong><p>Fase {generatedPlan.assessment.recovery.phase.replaceAll("_", " ")} · {generatedPlan.assessment.recovery.affectedAreas.join(", ")}. Pulso IA debe volver a conversar contigo antes de cambiar esta prescripción.</p></div></div>}
              {isProfileLoading ? <p className="progress-state">Cargando tu perfil…</p> : <div className="profile-form">
                <label className="profile-name-field">Nombre<input type="text" autoComplete="name" minLength={2} value={profile.displayName} onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))} /></label>
                <label>Objetivo<select value={profile.goal} onChange={(event) => setProfile((current) => ({ ...current, goal: event.target.value }))}>{["Ganar fuerza", "Ganar músculo", "Perder grasa", "Crear hábito", "Recuperar movimiento"].map((option) => <option key={option}>{option}</option>)}</select></label>
                <label>Nivel<select value={profile.experienceLevel} onChange={(event) => setProfile((current) => ({ ...current, experienceLevel: event.target.value }))}>{["Estoy empezando", "Ya entreno a veces", "Entreno con constancia"].map((option) => <option key={option}>{option}</option>)}</select></label>
                <label>Días por semana<select value={profile.daysPerWeek} onChange={(event) => setProfile((current) => ({ ...current, daysPerWeek: event.target.value }))}>{[2, 3, 4, 5].map((option) => <option key={option} value={option}>{option} días</option>)}</select></label>
                <fieldset><legend>Equipo disponible en casa</legend><div className="profile-equipment">{["Peso corporal", "Bandas", "Mancuernas", "Banco"].map((item) => <label key={item}><input type="checkbox" checked={profile.homeEquipment.includes(item)} onChange={() => toggleProfileEquipment(item)} /> {item}</label>)}</div></fieldset>
                <div className="profile-save"><p role="status">{profileMessage}</p><div><button className="button button-quiet" type="button" disabled={isSavingProfile || isRegeneratingPlan} onClick={() => void regeneratePlan()}>{generatedPlan?.assessment?.recovery ? "Actualizar con Pulso IA" : isRegeneratingPlan ? "Regenerando…" : "Regenerar plan"}</button><button className="button button-primary" type="button" disabled={isSavingProfile || isRegeneratingPlan} onClick={() => void saveProfile()}>{isSavingProfile ? "Guardando…" : "Guardar cambios"}</button></div></div>
              </div>}
              <div className="profile-session-panel">
                <div><span className="profile-session-icon" aria-hidden="true"><LogOut size={20} /></span><div><strong>Sesión de Pulso</strong><p>Cierra tu cuenta en este dispositivo. Tus planes seguirán guardados.</p></div></div>
                <button className="button button-danger" type="button" disabled={isSigningOut} onClick={() => void signOut()}>{isSigningOut ? "Cerrando…" : "Cerrar sesión"}</button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {activeNav === "Inicio" && (generatedPlan || isPlanLoading) ? <motion.section
          className="hero-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          aria-labelledby="session-title"
        >
          <div className="hero-copy">
            <span className="session-label"><Flame size={16} aria-hidden="true" /> {activePlanSession?.day ?? todayName} · sesión de hoy</span>
            <h2 id="session-title">{activePlanSession?.focus?.toUpperCase() ?? "TU SESIÓN"}{generatedPlan?.assessment?.recovery ? <><br />PASO A PASO</> : <><br />POWER</>}</h2>
            <p>{generatedPlan?.assessment?.recovery ? `Sigue la dosis indicada, registra tu respuesta y respeta las condiciones de detención de la fase ${generatedPlan.assessment.recovery.phase.replaceAll("_", " ")}.` : "Construye fuerza real. Hoy trabajas técnica, estabilidad y progresión."}</p>
            <div className="session-meta">
              <span><LocationIcon size={16} aria-hidden="true" /> {session.location}</span>
              <span><Clock3 size={16} aria-hidden="true" /> {session.duration}</span>
            </div>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={handleTrainingAction}>
                Iniciar rutina <ArrowRight size={18} aria-hidden="true" />
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
        </motion.section> : activeNav === "Inicio" ? <section className="no-plan-card" aria-labelledby="no-plan-title"><p className="eyebrow">Tu siguiente paso</p><h2 id="no-plan-title">CREA TU PRIMER PLAN.</h2><p>Completa una evaluación breve para recibir sesiones según tu objetivo, tu experiencia y el lugar donde entrenas.</p><a className="button button-primary" href="/evaluacion">Empezar evaluación <ArrowRight size={18} aria-hidden="true" /></a></section> : null}

        {activeNav === "Registrar" && <section className="registrar-view-heading" aria-labelledby="registrar-title">
          <div><p className="eyebrow">Sesión activa</p><h2 id="registrar-title">REGISTRA TU TRABAJO.</h2><p>Selecciona un ejercicio y guarda cada serie mientras entrenas.</p></div>
          {displayedPlanSession && <div className="registrar-session-summary"><span>{displayedPlanSession.day}</span><strong>{displayedPlanSession.focus}</strong><small>{displayedPlanSession.durationMinutes} min · {displayedPlanSession.context === "casa" ? "En casa" : "Gimnasio"}</small></div>}
        </section>}

        {activeNav === "Registrar" && !generatedPlan && !isPlanLoading && <section className="no-plan-card" aria-labelledby="registrar-no-plan-title"><p className="eyebrow">Antes de registrar</p><h2 id="registrar-no-plan-title">CREA TU PRIMER PLAN.</h2><p>Necesitas una rutina para registrar ejercicios y series.</p><a className="button button-primary" href="/evaluacion">Empezar evaluación <ArrowRight size={18} aria-hidden="true" /></a></section>}

        {(activeNav === "Inicio" || activeNav === "Registrar") && <AnimatePresence>
          {sessionStarted && generatedPlan && (
            <motion.section className="session-log-card" aria-labelledby="log-title" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={transition}>
              <div>
                <p className="eyebrow">Registrar serie</p>
                <h2 id="log-title">{activeExercise?.name ?? "Primer ejercicio"}</h2>
                <p>{activeExercise ? `${activeExercise.sets} series · dosis objetivo: ${activeExercise.repetitions} · ${activeExercise.restSeconds}s de descanso` : "Sincronizando el ejercicio de hoy."}</p>
                {activeExercise && getExerciseReference(activeExercise.name, generatedPlan.assessment?.biologicalSex) && <button className="exercise-reference-trigger" type="button" onClick={() => setReferenceExercise(activeExercise.name)}><BookOpen size={17} aria-hidden="true" /> Ver cómo se realiza</button>}
              </div>
              {displayedPlanSession && <div className="exercise-selector" role="tablist" aria-label="Ejercicios de la sesión">{displayedPlanSession.exercises.map((exercise, index) => <button key={`${exercise.name}-${index}`} type="button" role="tab" aria-selected={selectedExerciseIndex === index} className={selectedExerciseIndex === index ? "is-active" : ""} onClick={() => { setSelectedExerciseIndex(index); setSetNumber("1"); setDoseCompleted(exercise.repetitions); setLogMessage(""); }}>Ej. {index + 1}<span>{exercise.name}</span></button>)}</div>}
              <div className="log-fields">
                <label>Serie<input type="number" min="1" value={setNumber} onChange={(event) => setSetNumber(event.target.value)} /></label>
                {activeRecoveryPrescription ? <label>Dosis completada<input type="text" value={doseCompleted || activeExercise?.repetitions || ""} onChange={(event) => setDoseCompleted(event.target.value)} /></label> : <label>Reps<input type="number" min="0" value={repetitions} onChange={(event) => setRepetitions(event.target.value)} /></label>}
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
        </AnimatePresence>}

        {activeNav === "Inicio" && <><section className="dashboard-grid" aria-label="Resumen diario">
          <motion.article className="card schedule-card" initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ ...transition, delay: 0.06 }}>
            <div className="card-heading">
              <div>
                <p className="eyebrow">Programa semanal</p>
                <h2>CONSISTENCIA</h2>
              </div>
              <button className="text-button" type="button" onClick={() => router.push("/plan")}>Ver plan <ChevronRight size={16} aria-hidden="true" /></button>
            </div>
            <div className="week-row" aria-label="Calendario semanal">
              {calendarWeekdays.map(({ short, full }, index) => {
                const hasSession = generatedPlan?.sessions.some((plannedSession) => normalizeDay(plannedSession.day) === normalizeDay(full)) ?? false;
                const isToday = todayPosition === index;
                const status = hasSession && isToday ? "active" : hasSession ? "planned" : isToday ? "today" : "rest";
                return (
                  <div className="day" key={full}>
                    <span>{short}</span>
                    <span className={`day-number ${status}`} aria-label={`${full}: ${hasSession ? "sesión planificada" : "descanso"}`}>
                      {status === "active" ? <CircleCheck size={18} aria-hidden="true" /> : weekDates[index]}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="supporting-text"><strong>{generatedPlan?.sessions.length ?? 3} sesiones</strong> planificadas · lista para empezar.</p>
          </motion.article>

          <motion.article className="card next-card" initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ ...transition, delay: 0.12 }}>
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
              <p>{generatedPlan?.assessment?.recovery
                ? "Completaste la dosis indicada. Revisamos tolerancia y dolor antes de progresar."
                : "Completaste tus repeticiones objetivo. Mantenemos la carga para consolidar técnica."}</p>
              <a className="inline-link" href="#proximamente">Ver por qué <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </article>
        </section>

        <AnimatePresence>
          {place === "casa" && (
            <motion.div className="context-notice" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={transition}>
              <MapPinHouse size={20} aria-hidden="true" />
              <span><strong>Sesión adaptada para casa.</strong> Conservamos el objetivo de tren inferior usando el equipo disponible.</span>
            </motion.div>
          )}
        </AnimatePresence></>}
      </section>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {navItems.map(({ label, icon: Icon }) => (
          <motion.div
            className={`bottom-nav-item ${activeNav === label ? "is-active" : ""} ${label === "Registrar" ? "nav-action" : ""}`}
            key={label}
            whileTap={{ y: 2, scale: .92 }}
          >
            <Link href={navigationRoutes[label]} aria-current={activeNav === label ? "page" : undefined}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </motion.div>
        ))}
      </nav>
    </main>
  );
}

export default function HomePage() {
  return <AppWorkspace view="Inicio" />;
}
