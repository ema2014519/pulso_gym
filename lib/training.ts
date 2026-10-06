export type FitnessGoal = "Ganar fuerza" | "Ganar músculo" | "Perder grasa" | "Crear hábito";
export type ExperienceLevel = "Estoy empezando" | "Ya entreno a veces" | "Entreno con constancia";
export type TrainingContext = "gimnasio" | "casa";
export type SessionFocus = "Cuerpo completo" | "Tren inferior" | "Tren superior";

export type PlannedExercise = { id?: string; name: string; alternativeAtHome: string; sets: number; repetitions: string; restSeconds: number };
export type PlannedSession = { id: string; databaseId?: string; day: string; context: TrainingContext; focus: SessionFocus; durationMinutes: number; exercises: PlannedExercise[] };
export type WeeklyPlan = { goal: FitnessGoal; level: ExperienceLevel; rationale: string; sessions: PlannedSession[]; safetyNote: string };

const catalog: Record<SessionFocus, Array<[string, string]>> = {
  "Tren inferior": [["Sentadilla guiada", "Sentadilla búlgara"], ["Peso muerto rumano", "Peso muerto con mancuernas o mochila"], ["Prensa de piernas", "Zancadas atrás"], ["Plancha", "Plancha"]],
  "Tren superior": [["Press de pecho con mancuernas", "Flexiones inclinadas"], ["Jalón al pecho", "Remo con banda o mochila"], ["Press de hombros", "Press con mancuernas o pike push-up"], ["Pallof press", "Dead bug"]],
  "Cuerpo completo": [["Sentadilla goblet", "Sentadilla con pausa"], ["Remo en máquina", "Remo con banda o mochila"], ["Press de pecho", "Flexiones"], ["Peso muerto con mancuernas", "Puente de glúteos"]],
};

const prescriptions: Record<ExperienceLevel, { sets: number; repetitions: string; restSeconds: number }> = {
  "Estoy empezando": { sets: 2, repetitions: "8–12", restSeconds: 75 },
  "Ya entreno a veces": { sets: 3, repetitions: "8–12", restSeconds: 90 },
  "Entreno con constancia": { sets: 3, repetitions: "6–12", restSeconds: 105 },
};

function focusesFor(days: number): SessionFocus[] {
  if (days <= 2) return ["Cuerpo completo", "Cuerpo completo"];
  if (days === 3) return ["Tren inferior", "Tren superior", "Cuerpo completo"];
  if (days === 4) return ["Tren inferior", "Tren superior", "Tren inferior", "Tren superior"];
  return ["Tren inferior", "Tren superior", "Cuerpo completo", "Tren inferior", "Tren superior"];
}

export function generateWeeklyPlan(input: { goal: FitnessGoal; level: ExperienceLevel; daysPerWeek: number }): WeeklyPlan {
  const focus = focusesFor(Math.max(2, Math.min(input.daysPerWeek, 5)));
  const prescription = prescriptions[input.level];
  const names = ["Lunes", "Miércoles", "Viernes", "Sábado", "Domingo"];
  return {
    goal: input.goal,
    level: input.level,
    rationale: `Plan de ${focus.length} sesiones para ${input.goal.toLowerCase()}, con volumen inicial adaptado a ${input.level.toLowerCase()}.`,
    sessions: focus.map((sessionFocus, index) => ({ id: `session-${index + 1}`, day: names[index], context: "gimnasio", focus: sessionFocus, durationMinutes: input.level === "Estoy empezando" ? 35 : 45, exercises: catalog[sessionFocus].map(([name, alternativeAtHome]) => ({ name, alternativeAtHome, ...prescription })) })),
    safetyNote: "Detén el ejercicio ante dolor agudo o inusual y consulta a un profesional si tienes lesiones o condiciones médicas.",
  };
}

export function sessionForContext(session: PlannedSession, context: TrainingContext): PlannedSession {
  return context === "gimnasio" ? { ...session, context } : { ...session, context, exercises: session.exercises.map((exercise) => ({ ...exercise, name: exercise.alternativeAtHome })) };
}
