"use client";

import { useEffect, useMemo, useState } from "react";
import { getExerciseReference, hasCuratedExerciseReference, type ExerciseReference } from "./exercise-media";

type BiologicalSex = "femenino" | "masculino";
type MediaResponse = {
  status?: "pending" | "ready" | "failed";
  reference?: ExerciseReference | null;
  retryAfterSeconds?: number;
};

const generatedCache = new Map<string, ExerciseReference>();
const pendingRequests = new Map<string, Promise<ExerciseReference | null>>();

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function cacheKey(name: string, biologicalSex: BiologicalSex) {
  return `${biologicalSex}:${normalized(name)}`;
}

async function requestGeneratedReference(name: string, biologicalSex: BiologicalSex, instructions = "") {
  const key = cacheKey(name, biologicalSex);
  const cached = generatedCache.get(key);
  if (cached) return cached;
  const active = pendingRequests.get(key);
  if (active) return active;

  const request = (async () => {
    for (let poll = 0; poll < 4; poll += 1) {
      try {
        const response = await fetch("/api/exercise-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, biologicalSex, instructions }),
        });
        const payload = await response.json().catch(() => ({})) as MediaResponse;
        if (response.ok && payload.reference) {
          generatedCache.set(key, payload.reference);
          return payload.reference;
        }
        if (response.status !== 202) return null;
        const waitMs = Math.min(20_000, Math.max(4_000, (payload.retryAfterSeconds ?? 10) * 1000));
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      } catch {
        return null;
      }
    }
    return null;
  })().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, request);
  return request;
}

export function useExerciseReference(name: string, biologicalSex?: BiologicalSex, instructions = "") {
  const fallback = useMemo(() => getExerciseReference(name, biologicalSex), [biologicalSex, name]);
  const key = biologicalSex ? cacheKey(name, biologicalSex) : "";
  const [resolved, setResolved] = useState<{ key: string; reference: ExerciseReference | null } | null>(null);
  const generated = (key ? generatedCache.get(key) : undefined) ?? (resolved?.key === key ? resolved.reference ?? undefined : undefined);
  const attempted = resolved?.key === key;
  const shouldGenerate = Boolean(name && biologicalSex && !hasCuratedExerciseReference(name) && !generated && !attempted);

  useEffect(() => {
    if (!name || !biologicalSex || hasCuratedExerciseReference(name) || generatedCache.has(cacheKey(name, biologicalSex))) return;
    let cancelled = false;
    void requestGeneratedReference(name, biologicalSex, instructions).then((generated) => {
      if (!cancelled) setResolved({ key: cacheKey(name, biologicalSex), reference: generated });
    });
    return () => { cancelled = true; };
  }, [biologicalSex, instructions, name]);

  return { reference: generated ?? fallback, isGenerating: shouldGenerate };
}

export async function warmExerciseReferences(exercises: Array<{ name: string; instructions?: string }>, biologicalSex?: BiologicalSex) {
  if (!biologicalSex) return;
  const unique = [...new Map(exercises.filter((exercise) => exercise.name && !hasCuratedExerciseReference(exercise.name)).map((exercise) => [normalized(exercise.name), exercise])).values()];
  const queue = [...unique];
  const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
    while (queue.length) {
      const exercise = queue.shift();
      if (exercise) await requestGeneratedReference(exercise.name, biologicalSex, exercise.instructions);
    }
  });
  await Promise.all(workers);
}
