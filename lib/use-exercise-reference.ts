"use client";

import { getExerciseReference } from "./exercise-media";

type BiologicalSex = "femenino" | "masculino";

export function useExerciseReference(name: string, biologicalSex?: BiologicalSex, _instructions = "") {
  void _instructions;
  return {
    reference: getExerciseReference(name, biologicalSex),
    isGenerating: false,
  };
}

export async function warmExerciseReferences(
  _exercises: Array<{ name: string; instructions?: string }>,
  _biologicalSex?: BiologicalSex,
) {
  void _exercises;
  void _biologicalSex;
  // Las referencias viven en el catálogo local y no requieren generación ni precarga remota.
}
