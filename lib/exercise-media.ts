export type ExerciseReference = {
  image: string;
  alt: string;
  cues: string[];
};

const references: Record<string, ExerciseReference> = {
  "sentadilla guiada": { image: "/exercises/sentadilla-guiada.webp", alt: "Posición inicial y final de la sentadilla guiada en máquina Smith", cues: ["Pies firmes al ancho de hombros", "Rodillas alineadas con los pies", "Desciende manteniendo el torso estable"] },
  "peso muerto rumano": { image: "/exercises/peso-muerto-rumano.webp", alt: "Posición inicial y final del peso muerto rumano", cues: ["Cadera hacia atrás", "Espalda neutra durante todo el recorrido", "Mantén la carga cerca de las piernas"] },
  "prensa de piernas": { image: "/exercises/prensa-piernas.webp", alt: "Posición inicial y final de la prensa de piernas", cues: ["Apoya completamente la espalda", "Controla la profundidad sin despegar la cadera", "No bloquees las rodillas al extender"] },
  plancha: { image: "/exercises/plancha.webp", alt: "Versión adaptada y posición completa de la plancha frontal", cues: ["Forma una línea de hombros a talones", "Aprieta abdomen y glúteos", "Evita hundir la zona lumbar"] },
  "press de pecho con mancuernas": { image: "/exercises/press-pecho-mancuernas-v3.webp", alt: "Posición inicial y final del press de pecho con mancuernas", cues: ["Escápulas apoyadas y estables", "Muñecas alineadas con los antebrazos", "Baja las mancuernas con control"] },
  "jalon al pecho": { image: "/exercises/jalon-pecho.webp", alt: "Posición inicial y final del jalón al pecho", cues: ["Pecho elevado sin arquear en exceso", "Lleva los codos hacia abajo", "No tires detrás de la cabeza"] },
  "press de hombros": { image: "/exercises/press-hombros.webp", alt: "Posición inicial y final del press de hombros", cues: ["Costillas controladas", "Antebrazos verticales", "Extiende sin encoger los hombros"] },
  "pallof press": { image: "/exercises/pallof-press.webp", alt: "Posición inicial y final del Pallof press", cues: ["Mantén cadera y hombros al frente", "Extiende los brazos sin girar", "Separa los pies para ganar estabilidad"] },
  "sentadilla goblet": { image: "/exercises/sentadilla-goblet.webp", alt: "Posición inicial y final de la sentadilla goblet", cues: ["Sostén la mancuerna cerca del pecho", "Mantén los talones apoyados", "Empuja el suelo al subir"] },
  "remo en maquina": { image: "/exercises/remo-maquina.webp", alt: "Posición inicial y final del remo sentado en máquina", cues: ["Torso estable", "Inicia juntando suavemente las escápulas", "Lleva los codos hacia atrás sin elevar hombros"] },
  "press de pecho": { image: "/exercises/press-pecho.webp", alt: "Posición inicial y final del press de pecho en máquina", cues: ["Ajusta el asiento a la altura del pecho", "Mantén las escápulas apoyadas", "Regresa lentamente"] },
  "peso muerto con mancuernas": { image: "/exercises/peso-muerto-mancuernas.webp", alt: "Posición inicial y final del peso muerto con mancuernas", cues: ["Lleva la cadera hacia atrás", "Mantén las mancuernas cerca del cuerpo", "Sube extendiendo la cadera, no la espalda"] },
  "sentadilla bulgara": { image: "/exercises/sentadilla-bulgara-casa.webp", alt: "Posición inicial y final de la sentadilla búlgara con apoyo en una silla", cues: ["Apoya el empeine en una silla estable", "Mantén la rodilla delantera alineada con el pie", "Desciende de forma vertical y controlada"] },
  "peso muerto con mancuernas o mochila": { image: "/exercises/peso-muerto-mochila-casa.webp", alt: "Posición inicial y final del peso muerto con una mochila", cues: ["Carga la mochila de forma uniforme", "Lleva la cadera hacia atrás con la espalda neutra", "Mantén la carga cerca de las piernas"] },
  "zancadas atras": { image: "/exercises/zancadas-atras-casa.webp", alt: "Posición inicial y final de la zancada hacia atrás", cues: ["Da un paso suficientemente largo hacia atrás", "Mantén el pie delantero completamente apoyado", "Impúlsate con la pierna delantera para volver"] },
  "flexiones inclinadas": { image: "/exercises/flexiones-inclinadas-casa.webp", alt: "Posición inicial y final de las flexiones inclinadas sobre una superficie estable", cues: ["Usa una mesa o apoyo que no se deslice", "Mantén el cuerpo en una sola línea", "Lleva el pecho hacia el apoyo con control"] },
  "remo con banda o mochila": { image: "/exercises/remo-banda-mochila-casa.webp", alt: "Posición inicial y final del remo inclinado con una mochila", cues: ["Inclina el torso manteniendo la espalda neutra", "Lleva los codos hacia atrás sin elevar los hombros", "Evita impulsarte con la zona lumbar"] },
  "press con mancuernas o pike push-up": { image: "/exercises/press-hombros-casa.webp", alt: "Posición inicial y final del press de hombros con mancuernas en casa", cues: ["Mantén abdomen y glúteos activos", "Inicia con los antebrazos verticales", "Extiende sin arquear la zona lumbar"] },
  "dead bug": { image: "/exercises/dead-bug-casa.webp", alt: "Posición inicial y final del ejercicio dead bug", cues: ["Mantén la zona lumbar suavemente apoyada", "Extiende brazo y pierna contrarios", "Reduce el recorrido si pierdes el control abdominal"] },
  "sentadilla con pausa": { image: "/exercises/sentadilla-pausa-casa.webp", alt: "Posición inicial y posición baja de la sentadilla con pausa", cues: ["Mantén todo el pie apoyado", "Haz una pausa breve sin relajarte abajo", "Sube empujando el suelo de forma uniforme"] },
  flexiones: { image: "/exercises/flexiones-casa.webp", alt: "Posición inicial y final de la flexión de brazos en el suelo", cues: ["Alinea manos debajo de los hombros", "Mantén el cuerpo firme de cabeza a talones", "Acerca el pecho al suelo sin hundir la cadera"] },
  "puente de gluteos": { image: "/exercises/puente-gluteos-casa.webp", alt: "Posición inicial y final del puente de glúteos", cues: ["Apoya los pies cerca de los glúteos", "Eleva la cadera apretando los glúteos", "Evita arquear en exceso la zona lumbar"] },
};

function normalizeExerciseName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function getExerciseReference(name: string, biologicalSex?: "femenino" | "masculino") {
  const reference = references[normalizeExerciseName(name)];
  if (!reference || !biologicalSex) return reference;
  return { ...reference, image: reference.image.replace("/exercises/", `/exercises/${biologicalSex}/`) };
}
