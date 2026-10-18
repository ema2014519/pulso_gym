"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronLeft, ChevronRight, Dumbbell, House, Salad, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ActivityLevel, BiologicalSex, ExperienceLevel } from "@/lib/training";
import { AmbientGymBackground } from "../ambient-gym-background";

const steps = ["Datos físicos", "Ritmo", "Equipo", "Alimentación", "Seguridad"];
const levels: ExperienceLevel[] = ["Estoy empezando", "Ya entreno a veces", "Entreno con constancia"];

export default function EvaluacionPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<ExperienceLevel>(levels[0]);
  const [days, setDays] = useState("3");
  const [sessionMinutes, setSessionMinutes] = useState("45");
  const [homeEquipment, setHomeEquipment] = useState<string[]>(["Peso corporal"]);
  const [age, setAge] = useState("30");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>("femenino");
  const [heightCm, setHeightCm] = useState("165");
  const [weightKg, setWeightKg] = useState("65");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("ligero");
  const [sleepHours, setSleepHours] = useState("7");
  const [stressLevel, setStressLevel] = useState("5");
  const [allergies, setAllergies] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("Sin preferencia");
  const [accepted, setAccepted] = useState(false);

  const physicalDataValid = Number(age) >= 18 && Number(age) <= 100 && Number(heightCm) >= 120 && Number(heightCm) <= 230 && Number(weightKg) >= 35 && Number(weightKg) <= 300;
  const canContinue = step === 0 ? physicalDataValid : step === steps.length - 1 ? accepted : true;
  const toggleEquipment = (item: string) => setHomeEquipment((items) => items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item]);

  function next() {
    if (!canContinue) return;
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    window.sessionStorage.setItem("pulso-chat-intake", JSON.stringify({
      level,
      daysPerWeek: Number(days),
      sessionMinutes: Number(sessionMinutes),
      age: Number(age),
      biologicalSex,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      sleepHours: Number(sleepHours),
      stressLevel: Number(stressLevel),
      equipment: homeEquipment,
      allergies,
      dietaryPreference,
    }));
    window.sessionStorage.removeItem("pulso-chat-revision");
    router.push("/evaluacion-asistida");
  }

  return <main className="assessment-page">
    <AmbientGymBackground />
    <header className="assessment-header"><Link href="/" className="assessment-brand"><span><Dumbbell size={18} /></span> PULSO</Link><p>Paso {step + 1} de {steps.length}</p></header>
    <section className="assessment-shell" aria-labelledby="assessment-title">
      <div className="assessment-progress" aria-label={`Progreso: paso ${step + 1} de ${steps.length}`}><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      <AnimatePresence mode="wait"><motion.div className="assessment-card assessment-card-wide" key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
        <p className="eyebrow">{steps[step]}</p>

        {step === 0 && <><h1 id="assessment-title">TU PUNTO DE PARTIDA.</h1><p className="assessment-copy">Estos datos dan contexto a la conversación. Pulso IA decidirá el tipo de plan después de escucharte.</p><div className="assessment-fields"><label>Edad<input type="number" min="18" max="100" value={age} onChange={(event) => setAge(event.target.value)} /></label><label>Sexo fisiológico<select value={biologicalSex} onChange={(event) => setBiologicalSex(event.target.value as BiologicalSex)}><option value="femenino">Femenino</option><option value="masculino">Masculino</option></select></label><label>Altura (cm)<input type="number" min="120" max="230" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} /></label><label>Peso (kg)<input type="number" min="35" max="300" step="0.1" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} /></label></div>{!physicalDataValid && <p className="assessment-save-error">Revisa edad, altura y peso antes de continuar.</p>}</>}

        {step === 1 && <><h1 id="assessment-title">TU EXPERIENCIA Y TU RITMO.</h1><p className="assessment-copy">No estás eligiendo un plan. Solo indicas qué experiencia y tiempo tienes disponibles.</p><p className="assessment-subtitle">Experiencia</p><div className="selection-list">{levels.map((item) => <button className={`selection-row ${level === item ? "selected" : ""}`} onClick={() => setLevel(item)} type="button" key={item}><Dumbbell size={20} /><span>{item}</span><CheckCircle2 size={19} /></button>)}</div><div className="assessment-fields"><label>Días disponibles por semana<select value={days} onChange={(event) => setDays(event.target.value)}>{[2, 3, 4, 5].map((item) => <option key={item} value={item}>{item} días</option>)}</select></label><label>Minutos disponibles<select value={sessionMinutes} onChange={(event) => setSessionMinutes(event.target.value)}>{[30, 45, 60, 75].map((item) => <option key={item}>{item}</option>)}</select></label><label>Actividad diaria<select value={activityLevel} onChange={(event) => setActivityLevel(event.target.value as ActivityLevel)}><option value="sedentario">Mayormente sentado</option><option value="ligero">Actividad ligera</option><option value="moderado">Actividad moderada</option><option value="alto">Muy activo</option></select></label><label>Sueño habitual<input type="number" min="0" step="0.5" value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} /></label><label>Estrés (1–10)<input type="number" min="1" max="10" value={stressLevel} onChange={(event) => setStressLevel(event.target.value)} /></label></div></>}

        {step === 2 && <><h1 id="assessment-title">¿QUÉ TIENES DISPONIBLE?</h1><p className="assessment-copy">Pulso IA usará este equipo solo si encaja con lo que descubra en la conversación.</p><div className="equipment-head"><House size={21} /> Equipo disponible</div><div className="equipment-options">{["Peso corporal", "Bandas", "Mancuernas", "Banco"].map((item) => <label className="equipment-option" key={item}><input type="checkbox" checked={homeEquipment.includes(item)} onChange={() => toggleEquipment(item)} /><span>{item}</span></label>)}</div></>}

        {step === 3 && <><h1 id="assessment-title">ALIMENTACIÓN Y CONTEXTO.</h1><p className="assessment-copy">La IA considerará estos datos al conversar contigo; todavía no está creando una dieta.</p><div className="assessment-fields"><label>Preferencia<select value={dietaryPreference} onChange={(event) => setDietaryPreference(event.target.value)}>{["Sin preferencia", "Vegetariana", "Vegana", "Sin gluten", "Baja en lactosa"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Alergias o intolerancias<input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder="Ej.: maní, lactosa" /></label></div><div className="safety-box"><Salad size={26} /><div><strong>Pulso IA ajustará sus preguntas a tu caso.</strong><p>No prescribe menús clínicos ni reemplaza a un profesional de nutrición.</p></div></div></>}

        {step === 4 && <><h1 id="assessment-title">LISTO PARA CONVERSAR.</h1><div className="safety-box"><ShieldCheck size={26} /><div><strong>Pulso IA revisará contigo salud y limitaciones.</strong><p>El chat preguntará por molestias y señales de seguridad antes de decidir el enfoque del plan.</p></div></div><label className="consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Confirmo que estos datos son correctos y entiendo que la conversación no sustituye un diagnóstico médico.</span></label></>}

        <div className="assessment-actions"><button className="back-button" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ChevronLeft size={18} /> Atrás</button><button className="button button-primary" type="button" onClick={next} disabled={!canContinue}>{step === steps.length - 1 ? <><Sparkles size={18} /> Conversar con Pulso IA</> : <>Continuar <ChevronRight size={18} /></>}</button></div>
      </motion.div></AnimatePresence>
    </section>
  </main>;
}
