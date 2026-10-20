"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Camera, CheckCircle2, ChevronLeft, CircleAlert, ImagePlus, LoaderCircle, Mic, MicOff, Paperclip, Send, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { generateWeeklyPlan, type ActivityLevel, type BiologicalSex, type ExperienceLevel, type FitnessGoal, type NutritionProfile, type PlanAssessment, type PlanMode, type RecoveryProfile, type WeeklyPlan } from "@/lib/training";
import { AmbientGymBackground } from "../ambient-gym-background";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; imageCount?: number };
type ChatSummary = {
  planName: string;
  planMode: PlanMode;
  goal: "" | FitnessGoal;
  level: "" | ExperienceLevel;
  daysPerWeek: number;
  sessionMinutes: number;
  age: number;
  biologicalSex: "" | BiologicalSex;
  heightCm: number;
  weightKg: number;
  activityLevel: "" | ActivityLevel;
  sleepHours: number;
  stressLevel: number;
  equipment: string[];
  painPoints: string[];
  injuries: string;
  medicalConditions: string;
  medications: string;
  allergies: string;
  dietaryPreference: string;
  hasRedFlags: boolean;
  safetyReviewed: boolean;
  recovery: RecoveryProfile;
  nutritionProfile: NutritionProfile;
};
type ChatResponse = {
  reply: string;
  stage: "gathering" | "camera_recommended" | "ready" | "urgent";
  cameraRequest: { recommended: boolean; instruction: string };
  missingInformation: string[];
  summary: ChatSummary;
  planRevision: PlanRevision;
  error?: string;
};
type PlanRevision = {
  changeSummary: string[];
  sessions: Array<{
    day: string;
    context: "gimnasio" | "casa";
    focus: "Cuerpo completo" | "Tren inferior" | "Tren superior" | "Recuperación" | "Actividad adaptada";
    durationMinutes: number;
    exercises: Array<{
      name: string;
      alternativeAtHome: string;
      sets: number;
      repetitions: string;
      restSeconds: number;
      role: "principal" | "secundario" | "accesorio" | "estabilidad";
      targetRir: string;
    }>;
  }>;
};
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start(): void; stop(): void };

const emptyRecovery: RecoveryProfile = { status: "autocuidado", primaryGoal: "", affectedAreas: [], professionalDiagnosis: "", clinicalClearance: false, phase: "proteger", symptomTriggers: [], toleratedActivities: [], avoidActivities: [], homeCare: [], stopRules: [], progressionCriteria: [], exercises: [], activePhaseIndex: 0, phases: [] };
const emptyNutrition: NutritionProfile = { status: "general_guidance", objective: "", currentPattern: "", scheduleAndAccess: "", accessibleFoods: [], unavailableFoods: [], kitchenResources: "", strategy: "", mealStructure: [], recommendations: [], phaseGuidance: [], professionalReferral: "" };
const emptySummary: ChatSummary = { planName: "Mi plan personalizado", planMode: "fitness", goal: "", level: "", daysPerWeek: 0, sessionMinutes: 0, age: 0, biologicalSex: "", heightCm: 0, weightKg: 0, activityLevel: "", sleepHours: 0, stressLevel: 0, equipment: [], painPoints: [], injuries: "", medicalConditions: "", medications: "", allergies: "", dietaryPreference: "", hasRedFlags: false, safetyReviewed: false, recovery: emptyRecovery, nutritionProfile: emptyNutrition };
const initialMessage: ChatMessage = { id: "welcome", role: "assistant", content: "Hola, soy Pulso IA. Puedo ayudarte a crear un plan de entrenamiento, uno adaptado o un plan de recuperación orientativo. Cuéntame qué quieres mejorar y si tienes dolor, una lesión diagnosticada o algún movimiento que te limite. Podemos usar la cámara solo cuando aporte información." };
const quickPrompts = ["Quiero ganar fuerza", "Quiero recuperar una lesión", "Necesito adaptar mi rutina", "Quiero mejorar mi alimentación"];

function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function failureMessage(failure: unknown, fallback: string) {
  if (failure instanceof Error && failure.message) return failure.message;
  if (failure && typeof failure === "object") {
    const record = failure as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [record.message, record.details, record.hint].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (parts.length) return [...new Set(parts)].join(" ");
    if (typeof record.code === "string") return `${fallback} (${record.code})`;
  }
  return fallback;
}

function validPlanSummary(summary: ChatSummary) {
  const common = summary.goal && summary.level && summary.daysPerWeek >= 2 && summary.sessionMinutes >= 15 && summary.age >= 18 && summary.biologicalSex && summary.heightCm >= 120 && summary.weightKg >= 35 && summary.activityLevel && summary.sleepHours > 0 && summary.stressLevel > 0 && summary.safetyReviewed && !summary.hasRedFlags;
  const recoveryPhases = summary.recovery.phases ?? [];
  const recoveryReady = summary.planMode === "fitness" || Boolean(summary.recovery.primaryGoal && summary.recovery.affectedAreas.length && summary.recovery.symptomTriggers.length && summary.recovery.toleratedActivities.length && summary.recovery.stopRules.length && summary.recovery.progressionCriteria.length && summary.recovery.exercises?.length && recoveryPhases.length >= 2 && recoveryPhases.every((phase) => phase.exercises.length > 0));
  const recoveryAuthorized = summary.planMode === "fitness" || summary.recovery.status === "autocuidado" || summary.recovery.clinicalClearance;
  const nutritionReady = Boolean(summary.nutritionProfile.objective && summary.nutritionProfile.strategy && summary.nutritionProfile.accessibleFoods.length && summary.nutritionProfile.kitchenResources && summary.nutritionProfile.mealStructure.length && summary.nutritionProfile.recommendations.length);
  return Boolean(common && recoveryReady && recoveryAuthorized && nutritionReady);
}

export default function EvaluacionAsistidaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraCardRef = useRef<HTMLElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState<ChatSummary>(emptySummary);
  const [intake, setIntake] = useState<Partial<ChatSummary> | null>(null);
  const [revisionPlan, setRevisionPlan] = useState<WeeklyPlan | null>(null);
  const [planRevision, setPlanRevision] = useState<PlanRevision>({ changeSummary: [], sessions: [] });
  const [stage, setStage] = useState<ChatResponse["stage"]>("gathering");
  const [cameraInstruction, setCameraInstruction] = useState("");
  const [missingInformation, setMissingInformation] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const hasCompleteRevision = !revisionPlan || (planRevision.sessions.length === summary.daysPerWeek && planRevision.sessions.every((session) => session.exercises.length > 0));
  const canGeneratePlan = stage === "ready" && validPlanSummary(summary) && hasCompleteRevision;
  const planActionLabel = creatingPlan
    ? revisionPlan ? "Guardando actualización…" : "Creando y guardando…"
    : canGeneratePlan
      ? revisionPlan ? "Guardar actualización" : summary.planMode === "fitness" ? "Generar mi plan" : "Generar plan de recuperación"
      : revisionPlan ? "Actualización pendiente" : "Plan pendiente";
  const planActionStatus = creatingPlan
    ? "Estamos guardando el plan. No cierres esta pantalla."
    : canGeneratePlan
      ? revisionPlan ? "La nueva versión está lista para guardarse." : "Tu plan está listo para generarse."
      : stage === "urgent"
        ? "La conversación detectó señales que requieren atención profesional."
        : missingInformation.length > 0
          ? `Faltan ${missingInformation.length} ${missingInformation.length === 1 ? "dato" : "datos"} por confirmar en el chat.`
          : revisionPlan && !hasCompleteRevision
            ? "Pulso IA todavía está completando todas las sesiones de la nueva versión."
            : "Continúa la conversación hasta que Pulso IA confirme que el plan está listo.";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.sessionStorage.getItem("pulso-chat-intake");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<ChatSummary>;
          setIntake(parsed);
          setSummary((current) => ({ ...current, ...parsed, recovery: current.recovery, nutritionProfile: current.nutritionProfile }));
        } catch {
          window.sessionStorage.removeItem("pulso-chat-intake");
        }
      }
      const storedRevision = window.sessionStorage.getItem("pulso-chat-revision");
      if (storedRevision) {
        try {
          const parsed = JSON.parse(storedRevision) as WeeklyPlan;
          setRevisionPlan(parsed);
          setMessages([{ ...initialMessage, content: `He cargado “${parsed.name}”. Cuéntame qué falta, qué cambió o qué parte quieres mejorar. Revisaré entrenamiento, recuperación y alimentación antes de crear una nueva versión.` }]);
          const assessment = parsed.assessment;
          setSummary((current) => ({
            ...current,
            planName: `${parsed.name} · revisión`,
            planMode: assessment?.planMode ?? "fitness",
            goal: parsed.goal,
            level: parsed.level,
            daysPerWeek: parsed.sessions.length,
            sessionMinutes: parsed.sessions[0]?.durationMinutes ?? 0,
            age: assessment?.age ?? 0,
            biologicalSex: assessment?.biologicalSex ?? "",
            heightCm: assessment?.heightCm ?? 0,
            weightKg: assessment?.weightKg ?? 0,
            activityLevel: assessment?.activityLevel ?? "",
            sleepHours: assessment?.sleepHours ?? 0,
            stressLevel: assessment?.stressLevel ?? 0,
            injuries: assessment?.injuries ?? "",
            medicalConditions: assessment?.medicalConditions ?? "",
            medications: assessment?.medications ?? "",
            allergies: assessment?.allergies ?? "",
            dietaryPreference: assessment?.dietaryPreference ?? "",
            hasRedFlags: assessment?.hasRedFlags ?? false,
            safetyReviewed: !assessment?.hasRedFlags,
            recovery: assessment?.recovery ?? current.recovery,
            nutritionProfile: assessment?.nutritionProfile ?? current.nutritionProfile,
          }));
        } catch {
          window.sessionStorage.removeItem("pulso-chat-revision");
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ block: "end" }); }, [messages, sending]);
  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {
      setError("La cámara está autorizada, pero el navegador bloqueó la reproducción. Presiona el video para activarla.");
    });
    cameraCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [cameraOpen]);
  useEffect(() => () => {
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraOpen(false);
    setCameraStarting(false);
  }

  async function openCamera() {
    if (cameraStarting || streamRef.current) return;
    setCameraStarting(true); setCameraReady(false); setError("");
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported-camera");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (failure) {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOpen(false);
      const errorName = failure instanceof DOMException ? failure.name : "";
      setError(errorName === "NotAllowedError"
        ? "El navegador bloqueó la cámara. Autorízala desde el icono de permisos de la barra de direcciones y vuelve a intentarlo."
        : errorName === "NotFoundError"
          ? "No encontramos una cámara disponible en este dispositivo."
          : "No pudimos abrir la cámara. Revisa que otra aplicación no la esté usando e inténtalo nuevamente.");
    } finally { setCameraStarting(false); }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady || video.readyState < 2 || photos.length >= 3) {
      if (!cameraReady) setError("Espera unos segundos hasta que aparezca la imagen de la cámara.");
      return;
    }
    const canvas = document.createElement("canvas");
    const width = Math.min(720, video.videoWidth || 1280);
    canvas.width = width; canvas.height = Math.round(width * (video.videoHeight || 720) / (video.videoWidth || 1280));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotos((current) => [...current, canvas.toDataURL("image/jpeg", .72)]);
  }

  async function sendMessage(contentOverride?: string, imagesOverride?: string[]) {
    const content = (contentOverride ?? input).trim();
    const images = imagesOverride ?? [];
    if ((!content && !images.length) || sending) return;
    const userMessage: ChatMessage = { id: id(), role: "user", content: content || "Adjunto capturas autorizadas para que observes la zona.", imageCount: images.length || undefined };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages); setInput(""); setSending(true); setError("");
    try {
      const response = await fetch("/api/injury-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })), imagesBase64: images.map((image) => image.split(",")[1]), intake, existingPlan: revisionPlan }),
      });
      const result = await response.json() as ChatResponse;
      if (!response.ok) throw new Error(result.error || "No pudimos continuar la conversación.");
      setMessages((current) => [...current, { id: id(), role: "assistant", content: result.reply }]);
      setSummary(result.summary); setPlanRevision(result.planRevision ?? { changeSummary: [], sessions: [] }); setStage(result.stage); setCameraInstruction(result.cameraRequest.recommended ? result.cameraRequest.instruction : ""); setMissingInformation(result.missingInformation ?? []);
      if (images.length) { setPhotos([]); closeCamera(); }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No pudimos contactar a Pulso IA.");
    } finally { setSending(false); }
  }

  function toggleVoice() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const speechWindow = window as typeof window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) { setError("El dictado no está disponible en este navegador; puedes escribir normalmente."); return; }
    const recognition = new Constructor();
    recognition.lang = "es-BO"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = (event) => setInput((current) => `${current}${current ? " " : ""}${event.results[0]?.[0]?.transcript ?? ""}`);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError("No pudimos reconocer la voz. Inténtalo nuevamente o escribe tu respuesta."); };
    recognitionRef.current = recognition; setListening(true); recognition.start();
  }

  async function createPlan() {
    if (!canGeneratePlan || creatingPlan) return;
    setCreatingPlan(true); setError("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
      const assessment: PlanAssessment = {
        age: summary.age, biologicalSex: summary.biologicalSex as BiologicalSex, heightCm: summary.heightCm, weightKg: summary.weightKg,
        activityLevel: summary.activityLevel as ActivityLevel, sessionMinutes: summary.sessionMinutes,
        injuries: summary.injuries || summary.painPoints.join("; "), medicalConditions: summary.medicalConditions, medications: summary.medications,
        allergies: summary.allergies, dietaryPreference: summary.dietaryPreference, sleepHours: summary.sleepHours, stressLevel: summary.stressLevel, hasRedFlags: summary.hasRedFlags,
        planMode: summary.planMode, recovery: summary.planMode === "fitness" ? undefined : summary.recovery, nutritionProfile: summary.nutritionProfile,
      };
      const profilePayload = { id: user.id, goal: summary.goal, experience_level: summary.level, days_per_week: summary.daysPerWeek, home_equipment: summary.equipment.length ? summary.equipment : ["Peso corporal"], age: summary.age, biological_sex: summary.biologicalSex, height_cm: summary.heightCm, weight_kg: summary.weightKg, activity_level: summary.activityLevel, session_minutes: summary.sessionMinutes, injuries: assessment.injuries, medical_conditions: summary.medicalConditions, medications: summary.medications, allergies: summary.allergies, dietary_preference: summary.dietaryPreference, sleep_hours: summary.sleepHours, stress_level: summary.stressLevel, accepted_safety_notice_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);
      if (profileError) {
        const { error: legacyProfileError } = await supabase.from("profiles").upsert({
          id: user.id,
          goal: summary.goal,
          experience_level: summary.level,
          days_per_week: summary.daysPerWeek,
          home_equipment: summary.equipment.length ? summary.equipment : ["Peso corporal"],
          accepted_safety_notice_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (legacyProfileError) throw new Error(`No pudimos actualizar tu perfil: ${failureMessage(legacyProfileError, "error de base de datos")}`);
      }
      const generatedPlan = generateWeeklyPlan({ name: summary.planName || "Mi plan personalizado", goal: summary.goal as FitnessGoal, level: summary.level as ExperienceLevel, daysPerWeek: summary.daysPerWeek, assessment });
      const plan: WeeklyPlan = revisionPlan && planRevision.sessions.length
        ? {
            ...generatedPlan,
            rationale: planRevision.changeSummary.length
              ? `${generatedPlan.rationale} Cambios de esta revisión: ${planRevision.changeSummary.join("; ")}.`
              : generatedPlan.rationale,
            sessions: planRevision.sessions.map((session, sessionIndex) => ({
              ...session,
              id: `revision-${Date.now()}-${sessionIndex}`,
              exercises: session.exercises.map((exercise) => ({ ...exercise })),
            })),
          }
        : generatedPlan;
      const { data: planId, error: planError } = await supabase.rpc("save_weekly_plan", { plan_payload: plan });
      if (planError) throw new Error(`No pudimos guardar el plan: ${failureMessage(planError, "error de base de datos")}`);
      if (typeof planId !== "string" || !planId) throw new Error("La base de datos no devolvió el identificador del plan guardado.");
      window.sessionStorage.setItem("pulso-plan", JSON.stringify({ ...plan, databaseId: planId as string, createdAt: new Date().toISOString() }));
      window.sessionStorage.removeItem("pulso-chat-intake");
      window.sessionStorage.removeItem("pulso-chat-revision");
      router.push("/plan");
    } catch (failure) {
      const detail = failureMessage(failure, "No pudimos crear el plan.");
      console.error("[evaluacion-asistida] Error al crear el plan", failure);
      setError(detail);
    } finally { setCreatingPlan(false); }
  }

  return <main className="ai-chat-page">
    <AmbientGymBackground />
    <header className="ai-chat-header"><Link href={revisionPlan ? "/plan" : "/evaluacion"} className="guided-back"><ChevronLeft size={18} /> Volver</Link><div><Sparkles size={17} /><span>Pulso IA · Gemini</span></div><button type="button" className="chat-summary-button" onClick={() => setSummaryOpen(true)}>Resumen <span>{Object.values(summary).filter(Boolean).length}</span></button></header>
    <section className="ai-chat-shell" aria-label="Conversación con Pulso IA">
      <div className="ai-chat-main">
        <div className="ai-chat-title"><div><p className="eyebrow">{revisionPlan ? "Revisión conversacional" : "Evaluación conversacional"}</p><h1>{revisionPlan ? "MEJOREMOS TU PLAN." : "HABLEMOS DE TU PLAN."}</h1></div><span className={`chat-stage stage-${stage}`}>{stage === "ready" ? "Listo para crear" : stage === "urgent" ? "Atención prioritaria" : stage === "camera_recommended" ? "Cámara sugerida" : revisionPlan ? "Revisando versión" : "Recopilando datos"}</span></div>
        <div className="chat-thread" aria-live="polite">
          {messages.map((message) => <article key={message.id} className={`chat-bubble ${message.role}`}><span>{message.role === "assistant" ? <Sparkles size={16} /> : "Tú"}</span><div><p>{message.content}</p>{message.imageCount && <small><ImagePlus size={14} /> {message.imageCount} {message.imageCount === 1 ? "captura enviada" : "capturas enviadas"}</small>}</div></article>)}
          {sending && <article className="chat-bubble assistant is-thinking"><span><Sparkles size={16} /></span><div><LoaderCircle className="spin" size={20} /><p>Pulso IA está revisando la conversación…</p></div></article>}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && <div className="chat-quick-prompts">{(revisionPlan ? ["Faltan ejercicios", "Quiero ajustar la alimentación", "Cambió mi dolor o tolerancia", "Quiero cambiar días o duración"] : quickPrompts).map((prompt) => <button type="button" key={prompt} onClick={() => void sendMessage(prompt)}>{prompt}</button>)}</div>}

        {(cameraInstruction || cameraOpen || photos.length > 0) && <section ref={cameraCardRef} className="chat-camera-card" aria-label="Herramienta de cámara">
          <header><div><Camera size={20} /><span><strong>Observación con cámara</strong><small>{cameraInstruction || "Señala el punto de molestia y procura tener buena iluminación."}</small></span></div>{cameraOpen && <button type="button" aria-label="Cerrar cámara" onClick={closeCamera}><X size={18} /></button>}</header>
          {cameraOpen && <div className={`chat-camera-view${cameraReady ? " is-ready" : " is-loading"}`}><video ref={videoRef} muted playsInline autoPlay onLoadedMetadata={() => setCameraReady(true)} onPlaying={() => setCameraReady(true)} onClick={() => void videoRef.current?.play()} />{!cameraReady && <span className="chat-camera-loading"><LoaderCircle className="spin" size={18} /> Iniciando cámara…</span>}<span className="chat-camera-hint">Señala con una mano el punto de molestia</span></div>}
          {photos.length > 0 && <div className="chat-photo-strip">{photos.map((photo, index) => <div key={`${photo.slice(-16)}-${index}`}><Image src={photo} width={128} height={88} unoptimized alt={`Captura ${index + 1}`} /><button type="button" aria-label={`Eliminar captura ${index + 1}`} onClick={() => setPhotos((current) => current.filter((_, item) => item !== index))}><Trash2 size={14} /></button></div>)}</div>}
          <div className="chat-camera-actions">{!cameraOpen ? <button type="button" className="button button-quiet" aria-disabled={cameraStarting} onClick={() => void openCamera()}>{cameraStarting ? <LoaderCircle className="spin" size={18} /> : <Camera size={18} />}{cameraStarting ? "Abriendo…" : "Abrir cámara"}</button> : <button type="button" className="button button-quiet" aria-disabled={!cameraReady || photos.length >= 3} onClick={capturePhoto}><ImagePlus size={18} />{!cameraReady ? "Preparando cámara…" : photos.length >= 3 ? "Máximo de 3 capturas" : "Capturar imagen"}</button>}{photos.length > 0 && <button type="button" className="button button-primary" aria-disabled={sending} onClick={() => void sendMessage("Analiza estas capturas junto con lo que te conté. Estoy señalando la zona de molestia.", photos)}><Send size={18} /> Enviar {photos.length} {photos.length === 1 ? "captura" : "capturas"}</button>}</div>
          <p className="chat-camera-privacy"><ShieldCheck size={15} /> Solo se envían las capturas cuando presionas “Enviar”; nunca transmitimos el video completo.</p>
        </section>}

        {error && <div className="chat-error" role="alert"><CircleAlert size={18} /><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button></div>}
        {stage === "urgent" && <div className="chat-urgent"><CircleAlert size={21} /><div><strong>No generaremos un plan automáticamente con estas señales.</strong><p>Busca orientación profesional. Puedes conservar la conversación y volver cuando tengas indicaciones seguras.</p></div></div>}

        <div className="chat-composer">
          <div className={`chat-mobile-plan-action${canGeneratePlan ? " is-ready" : ""}`}>
            <span><small>{revisionPlan ? "Actualización del plan" : "Creación del plan"}</small><strong role="status" aria-live="polite">{planActionStatus}</strong></span>
            <button type="button" className="button button-primary chat-generate" aria-disabled={!canGeneratePlan || creatingPlan} onClick={() => void createPlan()}>{creatingPlan ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}{planActionLabel}</button>
          </div>
          <textarea value={input} maxLength={2000} rows={2} placeholder="Escribe tus dudas, síntomas, objetivos o responde a Pulso IA…" onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
          <div><button type="button" className={listening ? "is-listening" : ""} aria-label={listening ? "Detener dictado" : "Responder por voz"} onClick={toggleVoice}>{listening ? <MicOff size={19} /> : <Mic size={19} />}</button><button type="button" aria-label="Abrir cámara" onClick={() => { setCameraInstruction((current) => current || "Muestra y señala la zona sobre la que estás conversando."); void openCamera(); }}><Paperclip size={19} /></button><button type="button" className="chat-send" aria-label="Enviar mensaje" aria-disabled={sending || !input.trim()} onClick={() => void sendMessage()}>{sending ? <LoaderCircle className="spin" size={19} /> : <ArrowUp size={20} />}</button></div>
        </div>
        <p className="chat-disclaimer">Pulso IA orienta el entrenamiento y no sustituye un diagnóstico médico.</p>
      </div>

      <aside className="ai-chat-side">
        <p className="eyebrow">Información reunida</p><h2>TU CONTEXTO.</h2>
        <div className="chat-plan-mode"><small>Tipo de plan detectado</small><strong>{summary.planMode === "recovery" ? "Recuperación" : summary.planMode === "combined" ? "Entrenamiento adaptado" : "Fitness"}</strong></div>
        <div className="chat-fact-list"><span className={summary.goal ? "complete" : ""}><CheckCircle2 size={16} /> Objetivo y experiencia</span><span className={summary.age && summary.heightCm && summary.weightKg ? "complete" : ""}><CheckCircle2 size={16} /> Datos físicos</span><span className={summary.daysPerWeek && summary.sessionMinutes ? "complete" : ""}><CheckCircle2 size={16} /> Disponibilidad</span><span className={summary.safetyReviewed ? "complete" : ""}><CheckCircle2 size={16} /> Molestias y seguridad</span><span className={summary.nutritionProfile.strategy && summary.nutritionProfile.mealStructure.length ? "complete" : ""}><CheckCircle2 size={16} /> Estrategia alimentaria</span>{summary.planMode !== "fitness" && <span className={summary.recovery.primaryGoal && summary.recovery.affectedAreas.length ? "complete" : ""}><CheckCircle2 size={16} /> Perfil de recuperación</span>}</div>
        {summary.painPoints.length > 0 && <div className="chat-pain-summary"><strong>Puntos registrados</strong>{summary.painPoints.map((point) => <span key={point}>{point}</span>)}</div>}
        {missingInformation.length > 0 && <details className="chat-missing"><summary>Información pendiente ({missingInformation.length})</summary><ul>{missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></details>}
        {revisionPlan && planRevision.changeSummary.length > 0 && <details className="chat-missing"><summary>Cambios preparados ({planRevision.changeSummary.length})</summary><ul>{planRevision.changeSummary.map((item) => <li key={item}>{item}</li>)}</ul></details>}
        <button type="button" className="button button-primary chat-generate" aria-disabled={!canGeneratePlan || creatingPlan} onClick={() => void createPlan()}>{creatingPlan ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}{planActionLabel}</button>
        <small className="chat-generate-note">{planActionStatus} El plan se guarda como una nueva versión para conservar el anterior.</small>
      </aside>
    </section>

    {summaryOpen && <div className="chat-summary-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSummaryOpen(false); }}><section className="chat-summary-modal" role="dialog" aria-modal="true" aria-labelledby="chat-summary-title"><header><div><p className="eyebrow">Contexto del chat</p><h2 id="chat-summary-title">RESUMEN ACTUAL.</h2></div><button type="button" aria-label="Cerrar resumen" onClick={() => setSummaryOpen(false)}><X size={20} /></button></header><dl><div><dt>Tipo de plan</dt><dd>{summary.planMode === "recovery" ? "Recuperación" : summary.planMode === "combined" ? "Entrenamiento adaptado" : "Fitness"}</dd></div><div><dt>Objetivo</dt><dd>{summary.goal || "Pendiente"}</dd></div><div><dt>Experiencia</dt><dd>{summary.level || "Pendiente"}</dd></div><div><dt>Disponibilidad</dt><dd>{summary.daysPerWeek ? `${summary.daysPerWeek} días · ${summary.sessionMinutes} min` : "Pendiente"}</dd></div><div><dt>Datos físicos</dt><dd>{summary.age ? `${summary.age} años · ${summary.heightCm} cm · ${summary.weightKg} kg` : "Pendiente"}</dd></div><div><dt>Molestias</dt><dd>{summary.injuries || summary.painPoints.join("; ") || "Ninguna registrada todavía"}</dd></div>{summary.planMode !== "fitness" && <><div><dt>Meta funcional</dt><dd>{summary.recovery.primaryGoal || "Pendiente"}</dd></div><div><dt>Fase</dt><dd>{summary.recovery.phase.replaceAll("_", " ")}</dd></div><div><dt>Diagnóstico profesional</dt><dd>{summary.recovery.professionalDiagnosis || "No declarado"}</dd></div><div><dt>Autorización clínica</dt><dd>{summary.recovery.clinicalClearance ? "Confirmada por el usuario" : "No confirmada"}</dd></div></>}<div><dt>Alimentación</dt><dd>{summary.dietaryPreference || "Pendiente"}{summary.allergies ? ` · ${summary.allergies}` : ""}</dd></div><div><dt>Estrategia nutricional</dt><dd>{summary.nutritionProfile.strategy || "Pendiente de analizar en el chat"}</dd></div><div><dt>Estructura de comidas</dt><dd>{summary.nutritionProfile.mealStructure.length ? `${summary.nutritionProfile.mealStructure.length} momentos planificados` : "Pendiente"}</dd></div></dl><button type="button" className="button button-primary" onClick={() => setSummaryOpen(false)}>Seguir conversando</button></section></div>}
  </main>;
}
