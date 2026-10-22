import type { NutritionDayPlan, NutritionMealGuide, NutritionScheduledMeal, NutritionTargets, WeeklyPlan } from "@/lib/training";

export const NUTRITION_WEEK_DAYS = [
  { weekday: 1, day: "Lunes", short: "Lun" },
  { weekday: 2, day: "Martes", short: "Mar" },
  { weekday: 3, day: "Miércoles", short: "Mié" },
  { weekday: 4, day: "Jueves", short: "Jue" },
  { weekday: 5, day: "Viernes", short: "Vie" },
  { weekday: 6, day: "Sábado", short: "Sáb" },
  { weekday: 0, day: "Domingo", short: "Dom" },
] as const;

const defaultMeals = [
  { name: "Desayuno", time: "08:00", objective: "Comenzar el día con energía estable" },
  { name: "Almuerzo", time: "13:00", objective: "Sostener actividad, entrenamiento y recuperación" },
  { name: "Cena", time: "19:30", objective: "Cerrar el día con una comida suficiente y tolerable" },
] as const;

function validTime(value: string | undefined, fallback: string) {
  return value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function normalizedMeal(meal: Partial<NutritionScheduledMeal> | undefined, index: number, fallbackGuide?: NutritionMealGuide): NutritionScheduledMeal {
  const base = defaultMeals[index];
  const foods = (meal?.foods ?? []).map((item) => item.trim()).filter(Boolean);
  const option = fallbackGuide?.options?.[0]?.trim();
  return {
    name: meal?.name?.trim() || fallbackGuide?.moment?.trim() || base.name,
    time: validTime(meal?.time, base.time),
    objective: meal?.objective?.trim() || fallbackGuide?.objective?.trim() || base.objective,
    foods: foods.length ? foods : option ? [option] : ["Comida por definir con tus alimentos disponibles"],
    preparation: meal?.preparation?.trim() || "Preparación sencilla con los recursos disponibles.",
  };
}

function phaseForPlan(plan: WeeklyPlan) {
  const recovery = plan.assessment?.recovery;
  const phaseIndex = Math.max(0, Math.min(recovery?.activePhaseIndex ?? 0, Math.max(0, (recovery?.phases?.length ?? 1) - 1)));
  return recovery?.phases?.[phaseIndex]?.name || (plan.assessment?.planMode === "fitness" ? "Plan activo" : "Fase activa");
}

function normalizedDayName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function normalizeNutritionWeek(plan: WeeklyPlan, nutrition: NutritionTargets): NutritionDayPlan[] {
  const savedByWeekday = new Map((nutrition.weeklySchedule ?? plan.assessment?.nutritionProfile?.weeklySchedule ?? []).map((day) => [day.weekday, day]));
  const guides = nutrition.mealStructure ?? plan.assessment?.nutritionProfile?.mealStructure ?? [];
  const phaseName = phaseForPlan(plan);
  const phaseGuidance = (nutrition.phaseGuidance ?? plan.assessment?.nutritionProfile?.phaseGuidance ?? []).find((phase) => phase.phaseName.toLocaleLowerCase() === phaseName.toLocaleLowerCase())
    ?? (nutrition.phaseGuidance ?? plan.assessment?.nutritionProfile?.phaseGuidance ?? [])[0];

  return NUTRITION_WEEK_DAYS.map(({ weekday, day }, dayIndex) => {
    const saved = savedByWeekday.get(weekday);
    const session = plan.sessions.find((item) => normalizedDayName(item.day).startsWith(normalizedDayName(day).slice(0, 3)));
    const contextualFocus = session
      ? `Día de ${session.focus.toLocaleLowerCase()}: organiza estas comidas alrededor de una sesión de ${session.durationMinutes} minutos.`
      : `Día sin sesión programada: conserva regularidad y ajusta las porciones según hambre y actividad.`;
    return {
      weekday,
      day,
      phaseName: saved?.phaseName?.trim() || phaseName,
      focus: saved?.focus?.trim() || `${phaseGuidance?.focus ? `${phaseGuidance.focus} ` : ""}${contextualFocus}`,
      meals: defaultMeals.map((_, mealIndex) => {
        const guide = guides[mealIndex % Math.max(1, guides.length)];
        const rotatedGuide = guide && guide.options.length
          ? { ...guide, options: [guide.options[dayIndex % guide.options.length]] }
          : guide;
        return normalizedMeal(saved?.meals?.[mealIndex], mealIndex, rotatedGuide);
      }),
    };
  });
}

export function mealStructureFromWeek(week: NutritionDayPlan[]): NutritionMealGuide[] {
  const firstDay = week[0];
  if (!firstDay) return [];
  return firstDay.meals.map((meal) => ({ moment: meal.name, objective: meal.objective, options: meal.foods }));
}
