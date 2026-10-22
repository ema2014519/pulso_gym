export type FitnessGoal = "Ganar fuerza" | "Ganar músculo" | "Perder grasa" | "Crear hábito" | "Recuperar movimiento";
export type ExperienceLevel = "Estoy empezando" | "Ya entreno a veces" | "Entreno con constancia";
export type TrainingContext = "gimnasio" | "casa";
export type SessionFocus = "Cuerpo completo" | "Tren inferior" | "Tren superior" | "Recuperación" | "Actividad adaptada";
export type BiologicalSex = "femenino" | "masculino";
export type ActivityLevel = "sedentario" | "ligero" | "moderado" | "alto";
export type ExerciseRole = "principal" | "secundario" | "accesorio" | "estabilidad";
export type PlanMode = "fitness" | "recovery" | "combined";
export type RecoveryPhase = "proteger" | "recuperar_movilidad" | "reconstruir_capacidad" | "retorno_gradual";

export type RecoveryExercisePrescription = {
  name: string;
  purpose: string;
  sets: number;
  dose: string;
  restSeconds: number;
  sessionsPerWeek: number;
  timesPerDay?: number;
  suggestedTimes?: string[];
  instructions: string;
  stopIf: string;
};

export type RecoveryTreatmentPhase = {
  name: string;
  estimatedDuration: string;
  objective: string;
  gymActivities: string[];
  exercises: RecoveryExercisePrescription[];
  recommendations: string[];
  avoid: string[];
  advancementCriteria: string[];
  regressionCriteria: string[];
};

export type RecoveryProfile = {
  status: "autocuidado" | "guiado_por_profesional" | "pendiente_revision";
  primaryGoal: string;
  affectedAreas: string[];
  professionalDiagnosis: string;
  clinicalClearance: boolean;
  phase: RecoveryPhase;
  symptomTriggers: string[];
  toleratedActivities: string[];
  avoidActivities: string[];
  homeCare: string[];
  stopRules: string[];
  progressionCriteria: string[];
  exercises: RecoveryExercisePrescription[];
  phases?: RecoveryTreatmentPhase[];
  activePhaseIndex?: number;
};

export type NutritionMealGuide = {
  moment: string;
  objective: string;
  options: string[];
};

export type NutritionScheduledMeal = {
  name: string;
  time: string;
  objective: string;
  foods: string[];
  preparation: string;
};

export type NutritionDayPlan = {
  weekday: number;
  day: string;
  phaseName: string;
  focus: string;
  meals: NutritionScheduledMeal[];
};

export type NutritionPhaseGuidance = {
  phaseName: string;
  focus: string;
  adjustments: string[];
};

export type NutritionProfile = {
  status: "general_guidance" | "professional_review";
  objective: string;
  currentPattern: string;
  scheduleAndAccess: string;
  accessibleFoods: string[];
  unavailableFoods: string[];
  kitchenResources: string;
  strategy: string;
  mealStructure: NutritionMealGuide[];
  weeklySchedule?: NutritionDayPlan[];
  recommendations: string[];
  phaseGuidance: NutritionPhaseGuidance[];
  professionalReferral: string;
};

export function recoveryExercisesForCurrentPhase(profile?: RecoveryProfile) {
  if (!profile) return [];
  const phases = profile.phases ?? [];
  const requestedIndex = Number.isFinite(profile.activePhaseIndex) ? Math.round(profile.activePhaseIndex ?? 0) : 0;
  const activePhase = phases[Math.max(0, Math.min(requestedIndex, Math.max(0, phases.length - 1)))];
  return activePhase?.exercises?.length ? activePhase.exercises : profile.exercises ?? [];
}

export type PlanAssessment = {
  age: number;
  biologicalSex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  sessionMinutes: number;
  injuries: string;
  medicalConditions: string;
  medications: string;
  allergies: string;
  dietaryPreference: string;
  sleepHours: number;
  stressLevel: number;
  hasRedFlags: boolean;
  planMode?: PlanMode;
  recovery?: RecoveryProfile;
  nutritionProfile?: NutritionProfile;
};

export type NutritionTargets = {
  estimatedCalories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  waterLiters: number;
  note: string;
  strategy?: string;
  mealStructure?: NutritionMealGuide[];
  weeklySchedule?: NutritionDayPlan[];
  recommendations?: string[];
  phaseGuidance?: NutritionPhaseGuidance[];
  professionalReferral?: string;
  accessibleFoods?: string[];
  unavailableFoods?: string[];
  kitchenResources?: string;
};

export type EvidenceSource = {
  id: string;
  title: string;
  year: number;
  evidenceType: string;
  url: string;
  appliesTo: string;
};

export type PlanMethodology = {
  version: string;
  weeklySetTarget: string;
  targetEffort: string;
  progressionRule: string;
  recoveryAdjustment: string;
  timeAllocation: string;
  sources: EvidenceSource[];
};

export type PlannedExercise = {
  id?: string;
  name: string;
  alternativeAtHome: string;
  sets: number;
  repetitions: string;
  restSeconds: number;
  role?: ExerciseRole;
  targetRir?: string;
};

export type PlannedSession = {
  id: string;
  databaseId?: string;
  day: string;
  context: TrainingContext;
  focus: SessionFocus;
  durationMinutes: number;
  exercises: PlannedExercise[];
};

export type WeeklyPlan = {
  databaseId?: string;
  name: string;
  createdAt?: string;
  goal: FitnessGoal;
  level: ExperienceLevel;
  rationale: string;
  sessions: PlannedSession[];
  safetyNote: string;
  assessment?: PlanAssessment;
  nutrition?: NutritionTargets;
  methodology?: PlanMethodology;
};

type ExerciseTemplate = {
  name: string;
  alternativeAtHome: string;
  role: ExerciseRole;
};

const catalog: Record<Exclude<SessionFocus, "Recuperación" | "Actividad adaptada">, ExerciseTemplate[]> = {
  "Tren inferior": [
    { name: "Sentadilla guiada", alternativeAtHome: "Sentadilla búlgara", role: "principal" },
    { name: "Peso muerto rumano", alternativeAtHome: "Peso muerto con mancuernas o mochila", role: "principal" },
    { name: "Prensa de piernas", alternativeAtHome: "Zancadas atrás", role: "secundario" },
    { name: "Sentadilla goblet", alternativeAtHome: "Sentadilla con pausa", role: "secundario" },
    { name: "Peso muerto con mancuernas", alternativeAtHome: "Puente de glúteos", role: "accesorio" },
    { name: "Plancha", alternativeAtHome: "Plancha", role: "estabilidad" },
  ],
  "Tren superior": [
    { name: "Press de pecho con mancuernas", alternativeAtHome: "Flexiones inclinadas", role: "principal" },
    { name: "Jalón al pecho", alternativeAtHome: "Remo con banda o mochila", role: "principal" },
    { name: "Press de hombros", alternativeAtHome: "Press con mancuernas o pike push-up", role: "secundario" },
    { name: "Remo en máquina", alternativeAtHome: "Remo con banda o mochila", role: "secundario" },
    { name: "Press de pecho", alternativeAtHome: "Flexiones", role: "accesorio" },
    { name: "Pallof press", alternativeAtHome: "Dead bug", role: "estabilidad" },
  ],
  "Cuerpo completo": [
    { name: "Sentadilla goblet", alternativeAtHome: "Sentadilla con pausa", role: "principal" },
    { name: "Remo en máquina", alternativeAtHome: "Remo con banda o mochila", role: "principal" },
    { name: "Press de pecho", alternativeAtHome: "Flexiones", role: "secundario" },
    { name: "Peso muerto con mancuernas", alternativeAtHome: "Puente de glúteos", role: "secundario" },
    { name: "Press de hombros", alternativeAtHome: "Press con mancuernas o pike push-up", role: "accesorio" },
    { name: "Pallof press", alternativeAtHome: "Dead bug", role: "estabilidad" },
  ],
};

const evidenceSources: EvidenceSource[] = [
  {
    id: "acsm-2026",
    title: "ACSM Position Stand: Resistance Training Prescription",
    year: 2026,
    evidenceType: "Revisión de revisiones y consenso",
    url: "https://pubmed.ncbi.nlm.nih.gov/41843416/",
    appliesTo: "Carga, frecuencia, volumen y resultados del entrenamiento de fuerza.",
  },
  {
    id: "currier-2023",
    title: "Resistance training prescription for strength and hypertrophy",
    year: 2023,
    evidenceType: "Revisión sistemática y metaanálisis en red",
    url: "https://pubmed.ncbi.nlm.nih.gov/37414459/",
    appliesTo: "Combinación de carga, series y frecuencia según el objetivo.",
  },
  {
    id: "schoenfeld-2017",
    title: "Weekly resistance-training volume and muscle mass",
    year: 2017,
    evidenceType: "Revisión sistemática y metaanálisis",
    url: "https://pubmed.ncbi.nlm.nih.gov/27433992/",
    appliesTo: "Relación dosis-respuesta del volumen semanal para hipertrofia.",
  },
  {
    id: "refalo-2023",
    title: "Resistance training proximity-to-failure and hypertrophy",
    year: 2023,
    evidenceType: "Revisión sistemática y metaanálisis",
    url: "https://pubmed.ncbi.nlm.nih.gov/36334240/",
    appliesTo: "Esfuerzo y proximidad al fallo muscular.",
  },
  {
    id: "grgic-2017",
    title: "Short versus long inter-set rest intervals",
    year: 2017,
    evidenceType: "Revisión sistemática",
    url: "https://pubmed.ncbi.nlm.nih.gov/28641044/",
    appliesTo: "Selección del descanso entre series.",
  },
  {
    id: "issn-protein-2017",
    title: "ISSN Position Stand: protein and exercise",
    year: 2017,
    evidenceType: "Revisión y posición científica",
    url: "https://pubmed.ncbi.nlm.nih.gov/28642676/",
    appliesTo: "Objetivo orientativo de proteína para adultos sanos físicamente activos.",
  },
  {
    id: "who-rehabilitation-2024",
    title: "WHO: Rehabilitation",
    year: 2024,
    evidenceType: "Marco de rehabilitación de la OMS",
    url: "https://www.who.int/news-room/fact-sheets/detail/rehabilitation",
    appliesTo: "Recuperación centrada en la función, independencia y participación de la persona.",
  },
  {
    id: "nhs-msk-self-management",
    title: "NHS: Musculoskeletal self-management",
    year: 2025,
    evidenceType: "Orientación clínica para pacientes",
    url: "https://www.nhs.uk/conditions/sprains-and-strains/",
    appliesTo: "Actividad gradual, autocuidado y señales para solicitar evaluación profesional.",
  },
];

function focusesFor(days: number): Array<Exclude<SessionFocus, "Recuperación" | "Actividad adaptada">> {
  if (days <= 2) return ["Cuerpo completo", "Cuerpo completo"];
  if (days === 3) return ["Tren inferior", "Tren superior", "Cuerpo completo"];
  if (days === 4) return ["Tren inferior", "Tren superior", "Tren inferior", "Tren superior"];
  return ["Tren inferior", "Tren superior", "Cuerpo completo", "Tren inferior", "Tren superior"];
}

function setTargetFor(level: ExperienceLevel, goal: FitnessGoal, recoveryLimited: boolean) {
  let range = level === "Estoy empezando" ? [6, 8] : level === "Ya entreno a veces" ? [8, 12] : [10, 14];
  if (goal === "Crear hábito") range = [4, 8];
  if (goal === "Ganar fuerza") range = level === "Estoy empezando" ? [6, 8] : [8, 10];
  if (recoveryLimited) range = [Math.max(4, range[0] - 2), Math.max(6, range[1] - 2)];
  return `${range[0]}–${range[1]} series efectivas semanales por grupo muscular como punto de partida`;
}

function targetRirFor(goal: FitnessGoal, recoveryLimited: boolean) {
  const base = goal === "Crear hábito" ? "3–4 RIR" : goal === "Ganar músculo" ? "1–3 RIR" : "2–3 RIR";
  return recoveryLimited ? `${base}; mantener una repetición adicional en reserva mientras se recupera` : base;
}

function prescriptionFor(template: ExerciseTemplate, input: { goal: FitnessGoal; level: ExperienceLevel; recoveryLimited: boolean; sessionMinutes: number }) {
  const experienced = input.level === "Entreno con constancia";
  const beginner = input.level === "Estoy empezando";
  let sets = 2;
  let repetitions = "8–12";
  let restSeconds = 75;

  if (input.goal === "Ganar fuerza") {
    sets = template.role === "principal" ? (beginner ? 3 : 4) : template.role === "secundario" ? 3 : 2;
    repetitions = template.role === "principal" ? (beginner ? "5–8" : "3–6") : template.role === "estabilidad" ? "8–12 por lado" : "6–10";
    restSeconds = template.role === "principal" ? (beginner ? 120 : 180) : template.role === "secundario" ? 120 : 75;
  } else if (input.goal === "Ganar músculo") {
    sets = template.role === "principal" || template.role === "secundario" ? 3 : experienced ? 3 : 2;
    repetitions = template.role === "principal" ? "6–10" : template.role === "estabilidad" ? "10–15 por lado" : "8–12";
    restSeconds = template.role === "principal" ? 120 : template.role === "secundario" ? 90 : 75;
  } else if (input.goal === "Perder grasa") {
    sets = template.role === "principal" && !beginner ? 3 : 2;
    repetitions = template.role === "estabilidad" ? "10–15 por lado" : "8–12";
    restSeconds = template.role === "principal" ? 90 : 60;
  }

  if (input.recoveryLimited && template.role !== "principal") sets = Math.max(2, sets - 1);
  if (input.sessionMinutes <= 30) sets = Math.min(sets, 2);
  else if (input.sessionMinutes <= 45) sets = Math.min(sets, 3);
  return { sets, repetitions, restSeconds, targetRir: targetRirFor(input.goal, input.recoveryLimited) };
}

function estimateExerciseMinutes(exercise: PlannedExercise) {
  const secondsPerSet = 45 + exercise.restSeconds;
  return exercise.sets * secondsPerSet / 60 + 0.75;
}

function buildSessionExercises(input: {
  focus: Exclude<SessionFocus, "Recuperación" | "Actividad adaptada">;
  goal: FitnessGoal;
  level: ExperienceLevel;
  sessionMinutes: number;
  recoveryLimited: boolean;
}) {
  const warmupAndTransitions = input.sessionMinutes <= 30 ? 5 : 7;
  const workingMinutes = Math.max(18, input.sessionMinutes - warmupAndTransitions);
  const minimumExercises = input.focus === "Cuerpo completo" ? 4 : 3;
  const maximumExercises = input.goal === "Crear hábito" ? 4 : catalog[input.focus].length;
  const selected: PlannedExercise[] = [];
  let estimatedMinutes = 0;

  for (const template of catalog[input.focus]) {
    if (selected.length >= maximumExercises) break;
    const prescription = prescriptionFor(template, input);
    const exercise: PlannedExercise = {
      name: template.name,
      alternativeAtHome: template.alternativeAtHome,
      role: template.role,
      ...prescription,
    };
    const exerciseMinutes = estimateExerciseMinutes(exercise);
    if (selected.length >= minimumExercises && estimatedMinutes + exerciseMinutes > workingMinutes) break;
    selected.push(exercise);
    estimatedMinutes += exerciseMinutes;
  }

  return selected;
}

type RecoveryExercise = PlannedExercise & { areas: string[] };

const recoveryCatalog: RecoveryExercise[] = [
  { name: "Respiración diafragmática y relajación", alternativeAtHome: "Respiración diafragmática y relajación", sets: 2, repetitions: "5 respiraciones lentas", restSeconds: 30, role: "estabilidad", areas: ["cuello", "nuca", "hombro", "espalda", "mandíbula", "general"] },
  { name: "Movilidad cervical en rango cómodo", alternativeAtHome: "Movilidad cervical en rango cómodo", sets: 2, repetitions: "5 por dirección, sin forzar", restSeconds: 40, role: "estabilidad", areas: ["cuello", "nuca"] },
  { name: "Control escapular suave", alternativeAtHome: "Control escapular suave contra la pared", sets: 2, repetitions: "8–10", restSeconds: 45, role: "estabilidad", areas: ["cuello", "nuca", "hombro", "espalda alta"] },
  { name: "Movilidad torácica con apoyo", alternativeAtHome: "Movilidad torácica sentado", sets: 2, repetitions: "6–8 por lado", restSeconds: 45, role: "estabilidad", areas: ["cuello", "hombro", "espalda alta", "espalda"] },
  { name: "Balanceo de brazo sin carga", alternativeAtHome: "Balanceo de brazo sin carga", sets: 2, repetitions: "30 segundos", restSeconds: 40, role: "estabilidad", areas: ["hombro", "brazo", "codo"] },
  { name: "Deslizamiento asistido del brazo", alternativeAtHome: "Deslizamiento del brazo sobre una mesa", sets: 2, repetitions: "6–10 en rango cómodo", restSeconds: 45, role: "estabilidad", areas: ["hombro", "brazo", "codo"] },
  { name: "Contracción isométrica suave de cuádriceps", alternativeAtHome: "Contracción isométrica suave de cuádriceps", sets: 2, repetitions: "8 × 5 segundos", restSeconds: 45, role: "estabilidad", areas: ["rodilla", "muslo", "pierna"] },
  { name: "Deslizamiento de talón", alternativeAtHome: "Deslizamiento de talón acostado", sets: 2, repetitions: "8–10 en rango cómodo", restSeconds: 45, role: "estabilidad", areas: ["rodilla", "cadera", "pierna"] },
  { name: "Transferencia de peso con apoyo", alternativeAtHome: "Transferencia de peso junto a una pared", sets: 2, repetitions: "8 por lado", restSeconds: 45, role: "estabilidad", areas: ["tobillo", "pie", "rodilla", "cadera", "pierna"] },
  { name: "Basculación pélvica suave", alternativeAtHome: "Basculación pélvica acostado", sets: 2, repetitions: "8–10", restSeconds: 45, role: "estabilidad", areas: ["espalda baja", "lumbar", "cadera", "espalda"] },
  { name: "Caminata cómoda y controlada", alternativeAtHome: "Caminata cómoda en un espacio seguro", sets: 1, repetitions: "8–15 minutos", restSeconds: 60, role: "estabilidad", areas: ["general", "espalda", "cadera", "rodilla", "tobillo", "pierna"] },
];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function fallbackRecoveryExercises(profile: RecoveryProfile) {
  const areas = profile.affectedAreas.map(normalized);
  const selected = recoveryCatalog.filter((exercise) => exercise.areas.some((area) => area === "general" || areas.some((reported) => reported.includes(area) || area.includes(reported))));
  return (selected.length >= 3 ? selected : recoveryCatalog.filter((exercise) => exercise.areas.includes("general") || exercise.name.includes("Respiración")))
    .slice(0, 5)
    .map((exercise) => ({ name: exercise.name, alternativeAtHome: exercise.alternativeAtHome, sets: exercise.sets, repetitions: exercise.repetitions, restSeconds: exercise.restSeconds, role: exercise.role }));
}

function prescribedRecoveryExercises(profile: RecoveryProfile): PlannedExercise[] {
  const prescriptions = recoveryExercisesForCurrentPhase(profile);
  if (!prescriptions.length) return fallbackRecoveryExercises(profile);
  return prescriptions.map((exercise) => ({
    name: exercise.name.trim().slice(0, 90),
    alternativeAtHome: exercise.name.trim().slice(0, 90),
    sets: Math.max(1, Math.round(exercise.sets)),
    repetitions: exercise.dose.trim().slice(0, 80) || "Según tolerancia",
    restSeconds: Math.max(0, Math.round(exercise.restSeconds)),
    role: "estabilidad",
  }));
}

function recoverySessions(input: { daysPerWeek: number; sessionMinutes: number; recovery: RecoveryProfile }): PlannedSession[] {
  const days = ["Lunes", "Miércoles", "Viernes", "Sábado", "Domingo"];
  const exercises = prescribedRecoveryExercises(input.recovery);
  const prescriptions = recoveryExercisesForCurrentPhase(input.recovery);
  return days.slice(0, Math.max(2, Math.min(input.daysPerWeek, 5))).map((day, index) => {
    const scheduled = prescriptions.length
      ? exercises.filter((_, exerciseIndex) => index < Math.max(1, prescriptions[exerciseIndex]?.sessionsPerWeek ?? input.daysPerWeek))
      : exercises;
    return {
      id: `recovery-session-${index + 1}`,
      day,
      context: "casa" as const,
      focus: "Recuperación" as const,
      durationMinutes: Math.max(15, Math.min(input.sessionMinutes, 40)),
      exercises: scheduled.length ? scheduled : exercises.slice(0, 1),
    };
  });
}

function nutritionTargets(assessment: PlanAssessment, goal: FitnessGoal): NutritionTargets {
  const restingEnergy = 10 * assessment.weightKg + 6.25 * assessment.heightCm - 5 * assessment.age + (assessment.biologicalSex === "masculino" ? 5 : -161);
  const activityFactor: Record<ActivityLevel, number> = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, alto: 1.725 };
  const goalAdjustment = goal === "Perder grasa" ? -250 : goal === "Ganar músculo" ? 200 : 0;
  const estimatedCalories = Math.max(1200, Math.round((restingEnergy * activityFactor[assessment.activityLevel] + goalAdjustment) / 25) * 25);
  const proteinFactor = goal === "Crear hábito" ? 1.4 : 1.6;
  const proteinGrams = Math.round(assessment.weightKg * proteinFactor);
  const fatGrams = Math.round(assessment.weightKg * 0.8);
  return {
    estimatedCalories,
    proteinGrams,
    fatGrams,
    carbohydrateGrams: Math.max(0, Math.round((estimatedCalories - proteinGrams * 4 - fatGrams * 9) / 4)),
    waterLiters: Math.round(assessment.weightKg * 0.035 * 10) / 10,
    note: "Estimación educativa para un adulto sano. Ajusta según evolución de 2–4 semanas, hambre y rendimiento; condiciones clínicas requieren nutricionista o médico.",
    strategy: assessment.nutritionProfile?.strategy,
    mealStructure: assessment.nutritionProfile?.mealStructure,
    weeklySchedule: assessment.nutritionProfile?.weeklySchedule,
    recommendations: assessment.nutritionProfile?.recommendations,
    phaseGuidance: assessment.nutritionProfile?.phaseGuidance,
    professionalReferral: assessment.nutritionProfile?.professionalReferral,
    accessibleFoods: assessment.nutritionProfile?.accessibleFoods,
    unavailableFoods: assessment.nutritionProfile?.unavailableFoods,
    kitchenResources: assessment.nutritionProfile?.kitchenResources,
  };
}

export function generateWeeklyPlan(input: {
  name?: string;
  goal: FitnessGoal;
  level: ExperienceLevel;
  daysPerWeek: number;
  assessment?: PlanAssessment;
}): WeeklyPlan {
  const planMode = input.assessment?.planMode ?? "fitness";
  const recovery = input.assessment?.recovery;
  const focus = focusesFor(Math.max(2, Math.min(input.daysPerWeek, 5)));
  const names = ["Lunes", "Miércoles", "Viernes", "Sábado", "Domingo"];
  const sessionMinutes = input.assessment?.sessionMinutes ?? (input.level === "Estoy empezando" ? 35 : 45);
  const hasDeclaredLimitations = Boolean(input.assessment?.injuries.trim() || input.assessment?.medicalConditions.trim());
  const recoveryLimited = Boolean(input.assessment && (input.assessment.sleepHours < 6 || input.assessment.stressLevel >= 8 || hasDeclaredLimitations));
  const weeklySetTarget = setTargetFor(input.level, input.goal, recoveryLimited);
  const recoveryAdjustment = recoveryLimited
    ? "Inicio conservador por sueño, estrés o limitaciones declaradas; revisar tolerancia antes de aumentar volumen."
    : "Sin reducción inicial; progresar únicamente cuando se complete el rango con técnica y esfuerzo objetivo.";
  let sessions: PlannedSession[] = focus.map((sessionFocus, index) => ({
    id: `session-${index + 1}`,
    day: names[index],
    context: "gimnasio" as const,
    focus: sessionFocus,
    durationMinutes: sessionMinutes,
    exercises: buildSessionExercises({
      focus: sessionFocus,
      goal: input.goal,
      level: input.level,
      sessionMinutes,
      recoveryLimited,
    }),
  }));

  if (recovery && planMode !== "fitness") {
    const guidedSessions = recoverySessions({ daysPerWeek: input.daysPerWeek, sessionMinutes, recovery });
    if (planMode === "recovery") {
      sessions = guidedSessions;
    } else {
      const affected = normalized(recovery.affectedAreas.join(" "));
      const safeFocus: Exclude<SessionFocus, "Recuperación" | "Actividad adaptada"> = /hombro|brazo|codo|muñeca|mano|cuello|nuca/.test(affected)
        ? "Tren inferior"
        : /cadera|rodilla|tobillo|pie|pierna/.test(affected)
          ? "Tren superior"
          : "Cuerpo completo";
      const adapted = focus.map((_, index) => {
        const recoveryBlock = guidedSessions[index]?.exercises ?? [];
        const fitnessBlock = buildSessionExercises({ focus: safeFocus, goal: input.goal, level: input.level, sessionMinutes, recoveryLimited: true })
          .slice(0, Math.max(1, 7 - recoveryBlock.length));
        return {
        id: `adapted-session-${index + 1}`,
        day: names[index],
        context: "gimnasio" as const,
        focus: "Actividad adaptada" as const,
        durationMinutes: sessionMinutes,
        exercises: [...recoveryBlock, ...fitnessBlock],
        };
      });
      sessions = adapted;
    }
  }
  const exerciseRange = sessions.map((session) => session.exercises.length);
  const minimumExercises = Math.min(...exerciseRange);
  const maximumExercises = Math.max(...exerciseRange);
  const exerciseDescription = minimumExercises === maximumExercises ? `${minimumExercises} ejercicios por sesión` : `${minimumExercises}–${maximumExercises} ejercicios según la sesión`;

  return {
    name: input.name?.trim() || `Plan ${input.goal}`,
    goal: input.goal,
    level: input.level,
    rationale: recovery && planMode !== "fitness"
      ? `${planMode === "recovery" ? "Plan de recuperación orientativo" : "Plan combinado de recuperación y actividad adaptada"} para ${recovery.affectedAreas.join(", ") || "las molestias registradas"}. Está en fase “${recovery.phase.replaceAll("_", " ")}” y usa síntomas, tolerancia y antecedentes del chat; no supone un diagnóstico nuevo.`
      : `La rutina prioriza ${weeklySetTarget}, ${targetRirFor(input.goal, recoveryLimited)} y descansos distintos para ejercicios principales y accesorios. El tiempo disponible produce ${exerciseDescription}; no se usa una cantidad fija por duración.`,
    sessions,
    safetyNote: recovery && planMode !== "fitness"
      ? `Realiza únicamente movimientos cómodos y respeta estas reglas de detención: ${recovery.stopRules.join("; ") || "dolor creciente, pérdida de fuerza, mareo o alteraciones de sensibilidad"}. Este plan complementa, pero no reemplaza, la evaluación y el tratamiento de un profesional.`
      : hasDeclaredLimitations
      ? "Las limitaciones declaradas reducen la carga inicial, pero el sistema no diagnostica ni decide qué movimientos son seguros para una lesión. Revisa el plan con un fisioterapeuta o profesional sanitario antes de entrenar con dolor."
      : "Detén el ejercicio ante dolor agudo o inusual. Si aparecen síntomas médicos, solicita evaluación profesional antes de continuar.",
    assessment: input.assessment,
    nutrition: input.assessment && !input.assessment.hasRedFlags ? nutritionTargets(input.assessment, input.goal) : undefined,
    methodology: recovery && planMode !== "fitness" ? {
      version: "recovery-rules-1.0",
      weeklySetTarget: `${sessions.length} sesiones breves distribuidas para observar la respuesta entre exposiciones`,
      targetEffort: "Rango cómodo y controlado; una repetición nunca debe empeorar progresivamente los síntomas.",
      progressionRule: recovery.progressionCriteria.join("; ") || "Avanzar únicamente cuando la actividad actual sea estable durante varias sesiones.",
      recoveryAdjustment: `Fase actual: ${recovery.phase.replaceAll("_", " ")}. ${recovery.clinicalClearance ? "El usuario declaró autorización profesional." : "No existe autorización profesional confirmada; mantener alcance conservador."}`,
      timeAllocation: `Sesiones de ${Math.max(15, Math.min(sessionMinutes, 40))} minutos con pausas suficientes para comprobar tolerancia y técnica.`,
      sources: evidenceSources.filter((source) => source.id === "who-rehabilitation-2024" || source.id === "nhs-msk-self-management"),
    } : {
      version: "evidence-rules-1.0",
      weeklySetTarget,
      targetEffort: targetRirFor(input.goal, recoveryLimited),
      progressionRule: "Cuando completes el máximo del rango en todas las series durante dos sesiones, con la técnica estable y el RIR objetivo, aumenta la carga entre 2,5 % y 5 %.",
      recoveryAdjustment,
      timeAllocation: `Reserva de ${sessionMinutes <= 30 ? 5 : 7} minutos para calentamiento y transiciones; el resto se calcula con series, ejecución y descansos.`,
      sources: evidenceSources,
    },
  };
}

export function sessionForContext(session: PlannedSession, context: TrainingContext): PlannedSession {
  return context === "gimnasio"
    ? { ...session, context }
    : { ...session, context, exercises: session.exercises.map((exercise) => ({ ...exercise, name: exercise.alternativeAtHome })) };
}
