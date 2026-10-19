import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const BUCKET = "exercise-media";
const PROMPT_VERSION = "exercise-demo-v1";
const PENDING_TIMEOUT_MS = 3 * 60 * 1000;
const FAILED_RETRY_MS = 15 * 60 * 1000;

type BiologicalSex = "femenino" | "masculino";
type ExerciseMediaRequest = {
  name?: string;
  instructions?: string;
  biologicalSex?: BiologicalSex;
};

type StoredMedia = {
  normalized_name: string;
  exercise_name: string;
  biological_sex: BiologicalSex;
  status: "pending" | "ready" | "failed";
  sheet_path: string | null;
  start_path: string | null;
  end_path: string | null;
  alt_text: string;
  cues: unknown;
  validation: unknown;
  attempts: number;
  error_message: string | null;
  updated_at: string;
};

type ValidationResult = {
  valid: boolean;
  reviewed: boolean;
  confidence: "alta" | "media" | "baja";
  issues: string[];
};

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
}

function cleanText(value: string | undefined, maximum: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maximum);
}

function slugFor(value: string) {
  const normalized = normalizeName(value).replace(/\s+/g, "-") || "ejercicio";
  return `${normalized.slice(0, 72)}-${createHash("sha256").update(value).digest("hex").slice(0, 10)}`;
}

function safeCues(instructions: string) {
  const cues = instructions
    .split(/[.;]\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 8)
    .slice(0, 3);
  return cues.length ? cues : ["Realiza el movimiento lentamente", "Mantén una postura estable", "Detente si aparece dolor agudo o inusual"];
}

function publicUrl(admin: ReturnType<typeof createSupabaseAdminClient>, path: string | null) {
  if (!path) return "";
  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function responseFromStored(admin: ReturnType<typeof createSupabaseAdminClient>, media: StoredMedia) {
  return {
    status: media.status,
    reference: media.status === "ready" ? {
      image: publicUrl(admin, media.sheet_path),
      startImage: publicUrl(admin, media.start_path),
      endImage: publicUrl(admin, media.end_path),
      alt: media.alt_text,
      cues: Array.isArray(media.cues) ? media.cues.filter((cue): cue is string => typeof cue === "string") : [],
      generated: true,
      isFallback: false,
    } : null,
    validation: media.validation,
  };
}

function imagePrompt(name: string, instructions: string, biologicalSex: BiologicalSex) {
  const subject = biologicalSex === "femenino" ? "una mujer adulta" : "un hombre adulto";
  return `Crea una fotografía educativa profesional para una aplicación de ejercicio y recuperación.

Ejercicio: ${name}.
Instrucciones técnicas: ${instructions || "movimiento lento, controlado y dentro de un rango cómodo"}.

Composición obligatoria: una sola imagen horizontal 16:9 dividida exactamente en dos paneles iguales, sin borde ni separación visible. Panel izquierdo: ${subject} en la posición inicial. Panel derecho: exactamente la misma persona, ropa, cámara, escala, iluminación y escenario en la posición final. El cambio entre paneles debe mostrar con claridad el movimiento descrito.

Estilo: fotografía fotorrealista de educación fisioterapéutica, anatomía realista, ropa deportiva gris oscuro con un detalle naranja, estudio moderno oscuro con fondo carbón e iluminación cálida sutil. Encuadre suficientemente amplio para mostrar completas todas las articulaciones implicadas y cualquier equipo necesario.

Seguridad visual: técnica conservadora y biomecánicamente plausible; expresión neutral; sin cargas ni amplitudes que no estén indicadas. No agregues texto, flechas, rótulos, logotipos, marcas de agua, marcos, franjas blancas, personas adicionales ni objetos innecesarios. No dupliques extremidades ni deformes manos, pies o articulaciones. La línea central debe contener únicamente fondo oscuro y no cortar el cuerpo.`;
}

async function generateImage(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no está configurada.");
  const client = new GoogleGenAI({ apiKey });
  const interaction = await client.interactions.create({
    model: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
    input: prompt,
    response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "16:9", image_size: "1K" },
  });
  const encoded = interaction.output_image?.data;
  if (!encoded) throw new Error("Gemini no devolvió una imagen.");
  return Buffer.from(encoded, "base64");
}

function parseJson(value: string) {
  const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as { valid?: unknown; confidence?: unknown; issues?: unknown };
}

async function validateImage(buffer: Buffer, name: string, instructions: string): Promise<ValidationResult> {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 700 || metadata.height < 350) {
    return { valid: false, reviewed: true, confidence: "alta", issues: ["La imagen no tiene resolución o proporción suficiente."] };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { valid: true, reviewed: false, confidence: "baja", issues: ["Validación visual no disponible."] };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL || "gemini-3.8-flash")}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: `Revisa esta demostración del ejercicio "${name}". La instrucción es: "${instructions}". Debe contener exactamente dos paneles: inicio a la izquierda y final a la derecha, la misma persona y una técnica biomecánicamente plausible. Marca valid=false si hay extremidades duplicadas, manos o articulaciones deformes, equipo incorrecto, una postura peligrosa, personas adicionales, texto, franjas claras o si no se entiende el cambio de posición. No diagnostiques ni valores al usuario.` },
          { inlineData: { mimeType: "image/jpeg", data: buffer.toString("base64") } },
        ] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              valid: { type: "BOOLEAN" },
              confidence: { type: "STRING", enum: ["alta", "media", "baja"] },
              issues: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["valid", "confidence", "issues"],
          },
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Validador ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    if (!text) throw new Error("El validador no respondió.");
    const result = parseJson(text);
    return {
      valid: result.valid === true,
      reviewed: true,
      confidence: result.confidence === "alta" || result.confidence === "media" ? result.confidence : "baja",
      issues: Array.isArray(result.issues) ? result.issues.filter((issue): issue is string => typeof issue === "string").slice(0, 8) : [],
    };
  } catch (error) {
    return { valid: true, reviewed: false, confidence: "baja", issues: [`Validación automática no disponible: ${error instanceof Error ? error.message : "error desconocido"}`] };
  }
}

async function prepareFrames(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) throw new Error("La imagen generada no tiene dimensiones válidas.");
  const frameWidth = Math.floor(metadata.width / 2);
  const rightStart = metadata.width - frameWidth;
  const [start, end] = await Promise.all([
    sharp(buffer).extract({ left: 0, top: 0, width: frameWidth, height: metadata.height }).webp({ quality: 86 }).toBuffer(),
    sharp(buffer).extract({ left: rightStart, top: 0, width: frameWidth, height: metadata.height }).webp({ quality: 86 }).toBuffer(),
  ]);
  const sheet = await sharp({ create: { width: frameWidth * 2, height: metadata.height, channels: 3, background: "#080c0d" } })
    .composite([{ input: start, left: 0, top: 0 }, { input: end, left: frameWidth, top: 0 }])
    .webp({ quality: 86 })
    .toBuffer();
  return { sheet, start, end };
}

async function uploadMedia(admin: ReturnType<typeof createSupabaseAdminClient>, folder: string, media: Awaited<ReturnType<typeof prepareFrames>>) {
  const paths = { sheet: `${folder}/demostracion.webp`, start: `${folder}/inicio.webp`, end: `${folder}/final.webp` };
  const uploaded: string[] = [];
  try {
    for (const [path, body] of [[paths.sheet, media.sheet], [paths.start, media.start], [paths.end, media.end]] as const) {
      const { error } = await admin.storage.from(BUCKET).upload(path, body, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
      if (error && !/already exists|duplicate/i.test(error.message)) throw error;
      if (!error) uploaded.push(path);
    }
    return paths;
  } catch (error) {
    if (uploaded.length) await admin.storage.from(BUCKET).remove(uploaded);
    throw error;
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return Response.json({ error: "Debes iniciar sesión." }, { status: 401 });

  let payload: ExerciseMediaRequest;
  try {
    payload = await request.json() as ExerciseMediaRequest;
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const name = cleanText(payload.name, 120);
  const instructions = cleanText(payload.instructions, 600);
  const biologicalSex = payload.biologicalSex;
  if (!name || (biologicalSex !== "femenino" && biologicalSex !== "masculino")) {
    return Response.json({ error: "Faltan el ejercicio o el sexo fisiológico para crear la referencia." }, { status: 400 });
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "El almacenamiento no está configurado." }, { status: 503 });
  }

  const normalizedName = normalizeName(name);
  const select = () => admin.from("exercise_media").select("normalized_name,exercise_name,biological_sex,status,sheet_path,start_path,end_path,alt_text,cues,validation,attempts,error_message,updated_at")
    .eq("normalized_name", normalizedName).eq("biological_sex", biologicalSex).eq("prompt_version", PROMPT_VERSION).maybeSingle<StoredMedia>();
  const { data: cached, error: cacheError } = await select();
  if (cacheError) return Response.json({ error: "La migración de imágenes todavía no está aplicada.", detail: cacheError.message }, { status: 503 });
  if (cached?.status === "ready") return Response.json(responseFromStored(admin, cached));

  const updatedAt = cached ? new Date(cached.updated_at).getTime() : 0;
  const age = Date.now() - updatedAt;
  if (cached?.status === "pending" && age < PENDING_TIMEOUT_MS) return Response.json({ status: "pending", retryAfterSeconds: 12 }, { status: 202 });
  if (cached?.status === "failed" && age < FAILED_RETRY_MS) return Response.json({ status: "failed", retryAfterSeconds: Math.ceil((FAILED_RETRY_MS - age) / 1000) }, { status: 503 });

  const pendingRow = {
    normalized_name: normalizedName,
    exercise_name: name,
    biological_sex: biologicalSex,
    prompt_version: PROMPT_VERSION,
    status: "pending",
    attempts: (cached?.attempts ?? 0) + 1,
    error_message: null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };
  if (!cached) {
    const { error: pendingError } = await admin.from("exercise_media").insert(pendingRow);
    if (pendingError) {
      if (pendingError.code === "23505") return Response.json({ status: "pending", retryAfterSeconds: 12 }, { status: 202 });
      return Response.json({ error: "No pudimos reservar la generación de la imagen.", detail: pendingError.message }, { status: 500 });
    }
  } else {
    const { data: claimed, error: pendingError } = await admin.from("exercise_media").update(pendingRow)
      .eq("normalized_name", normalizedName).eq("biological_sex", biologicalSex).eq("prompt_version", PROMPT_VERSION)
      .eq("updated_at", cached.updated_at).select("normalized_name").maybeSingle();
    if (pendingError) return Response.json({ error: "No pudimos reintentar la generación de la imagen.", detail: pendingError.message }, { status: 500 });
    if (!claimed) return Response.json({ status: "pending", retryAfterSeconds: 12 }, { status: 202 });
  }

  try {
    let image: Buffer | null = null;
    let validation: ValidationResult = { valid: false, reviewed: false, confidence: "baja", issues: [] };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      image = await generateImage(imagePrompt(name, instructions, biologicalSex));
      validation = await validateImage(image, name, instructions);
      if (validation.valid) break;
    }
    if (!image || !validation.valid) throw new Error(`La revisión visual rechazó la demostración: ${validation.issues.join(" · ") || "técnica no verificable"}`);

    const prepared = await prepareFrames(image);
    const folder = `${slugFor(normalizedName)}/${biologicalSex}/${Date.now()}`;
    const paths = await uploadMedia(admin, folder, prepared);
    const cues = safeCues(instructions);
    const { error: readyError } = await admin.from("exercise_media").update({
      status: "ready",
      sheet_path: paths.sheet,
      start_path: paths.start,
      end_path: paths.end,
      alt_text: `Posición inicial y final de ${name}`,
      cues,
      validation,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("normalized_name", normalizedName).eq("biological_sex", biologicalSex).eq("prompt_version", PROMPT_VERSION);
    if (readyError) throw readyError;
    const { data: ready } = await select();
    if (!ready) throw new Error("La referencia se generó pero no pudo recuperarse.");
    return Response.json(responseFromStored(admin, ready));
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 800) : "Error desconocido";
    await admin.from("exercise_media").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() })
      .eq("normalized_name", normalizedName).eq("biological_sex", biologicalSex).eq("prompt_version", PROMPT_VERSION);
    console.error("[exercise-media] No se pudo generar la referencia", { exercise: normalizedName, error: message });
    return Response.json({ status: "failed", error: "No pudimos generar la referencia exacta; se mantendrá una guía visual general.", retryAfterSeconds: FAILED_RETRY_MS / 1000 }, { status: 503 });
  }
}
