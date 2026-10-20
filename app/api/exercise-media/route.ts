import { getExerciseReference } from "@/lib/exercise-media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExerciseMediaRequest = {
  name?: string;
  biologicalSex?: "femenino" | "masculino";
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });

  let payload: ExerciseMediaRequest;
  try {
    payload = await request.json() as ExerciseMediaRequest;
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const name = payload.name?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "";
  if (!name || (payload.biologicalSex !== "femenino" && payload.biologicalSex !== "masculino")) {
    return Response.json({ error: "Faltan el ejercicio o el sexo fisiológico." }, { status: 400 });
  }

  return Response.json({
    status: "ready",
    source: "catalog",
    reference: getExerciseReference(name, payload.biologicalSex),
  });
}
