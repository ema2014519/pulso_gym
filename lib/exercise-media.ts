export type ExerciseReference = {
  image: string;
  startImage?: string;
  endImage?: string;
  alt: string;
  cues: string[];
  generated?: boolean;
  isFallback?: boolean;
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
  "respiracion diafragmatica y relajacion": { image: "/exercises/respiracion-diafragmatica.webp", alt: "Posición inicial y final de la respiración diafragmática", cues: ["Coloca una mano en el pecho y otra en el abdomen", "Inhala lentamente sin elevar los hombros", "Deja que el abdomen se expanda de forma suave"] },
  "movilidad cervical en rango comodo": { image: "/exercises/movilidad-cervical.webp", alt: "Inicio y final de una rotación cervical suave", cues: ["Mantén los hombros relajados", "Gira la cabeza despacio dentro de un rango cómodo", "Detente si aparece mareo, hormigueo o dolor creciente"] },
  "control escapular suave": { image: "/exercises/control-escapular.webp", alt: "Posición inicial y final del control escapular contra la pared", cues: ["Apoya el cuerpo sin arquear la zona lumbar", "Lleva suavemente las escápulas hacia abajo y atrás", "Evita encoger los hombros o contener la respiración"] },
  "movilidad toracica con apoyo": { image: "/exercises/movilidad-toracica.webp", alt: "Posición inicial y final de la rotación torácica sentada", cues: ["Mantén los pies apoyados y la pelvis estable", "Gira desde la parte alta del tronco", "Usa un recorrido cómodo sin forzar el cuello"] },
  "balanceo de brazo sin carga": { image: "/exercises/balanceo-brazo.webp", alt: "Posición inicial y final del balanceo pendular del brazo", cues: ["Apoya una mano y deja el otro brazo relajado", "Inicia un balanceo corto con el movimiento del cuerpo", "No eleves activamente el hombro"] },
  "deslizamiento asistido del brazo": { image: "/exercises/deslizamiento-brazo.webp", alt: "Posición inicial y final del deslizamiento asistido del brazo sobre una mesa", cues: ["Apoya la mano sobre una toalla", "Desliza el brazo mientras inclinas ligeramente el tronco", "Mantén el hombro relajado y trabaja sin dolor intenso"] },
  "contraccion isometrica suave de cuadriceps": { image: "/exercises/isometrico-cuadriceps.webp", alt: "Posición para la contracción isométrica de cuádriceps", cues: ["Coloca una toalla enrollada debajo de la rodilla", "Presiona la rodilla suavemente contra la toalla", "Mantén el talón apoyado y respira con normalidad"] },
  "deslizamiento de talon": { image: "/exercises/deslizamiento-talon.webp", alt: "Posición inicial y final del deslizamiento de talón", cues: ["Mantén el talón en contacto con el suelo", "Acerca el pie lentamente sin forzar la rodilla", "Conserva la pelvis estable durante el recorrido"] },
  "transferencia de peso con apoyo": { image: "/exercises/transferencia-peso.webp", alt: "Posición inicial y final de la transferencia de peso con apoyo", cues: ["Usa el apoyo solo para mantener el equilibrio", "Desplaza el peso de forma gradual sin levantar los pies", "Mantén las rodillas suaves y el tronco erguido"] },
  "basculacion pelvica suave": { image: "/exercises/basculacion-pelvica.webp", alt: "Posición inicial y final de la basculación pélvica acostada", cues: ["Apoya ambos pies y relaja la espalda", "Activa suavemente el abdomen para acercar la zona lumbar al suelo", "No eleves la cadera como en un puente"] },
  "caminata comoda y controlada": { image: "/exercises/caminata-controlada.webp", alt: "Dos posiciones consecutivas de una caminata cómoda y controlada", cues: ["Camina a un ritmo que permita hablar con normalidad", "Mantén pasos cómodos y una postura relajada", "Reduce o detén la marcha si los síntomas aumentan"] },
};

const referenceAliases: Array<{ pattern: RegExp; key: keyof typeof references }> = [
  { pattern: /respiracion.*(diafrag|abdomin)|diafrag.*respiracion/, key: "respiracion diafragmatica y relajacion" },
  { pattern: /(movilidad|rotacion).*cervical|cervical.*(movilidad|rotacion)/, key: "movilidad cervical en rango comodo" },
  { pattern: /(control|retraccion|activacion).*escapul|escapul.*(control|retraccion|activacion)/, key: "control escapular suave" },
  { pattern: /(movilidad|rotacion).*toracic|toracic.*(movilidad|rotacion)/, key: "movilidad toracica con apoyo" },
  { pattern: /(balanceo|pendulo|pendular|codman).*(brazo|hombro)|(brazo|hombro).*(balanceo|pendulo|pendular|codman)/, key: "balanceo de brazo sin carga" },
  { pattern: /(deslizamiento|deslizar).*(brazo|hombro).*(mesa|apoyo|asist)|(brazo|hombro).*(deslizamiento|deslizar).*(mesa|apoyo|asist)/, key: "deslizamiento asistido del brazo" },
  { pattern: /(isometr|contraccion).*(cuadriceps)|cuadriceps.*(isometr|contraccion)/, key: "contraccion isometrica suave de cuadriceps" },
  { pattern: /(deslizamiento|deslizar).*(talon)|talon.*(deslizamiento|deslizar)/, key: "deslizamiento de talon" },
  { pattern: /(transferencia|cambio|desplazamiento).*(peso).*(apoyo|de pie)|(peso).*(transferencia|cambio|desplazamiento)/, key: "transferencia de peso con apoyo" },
  { pattern: /(basculacion|inclinacion).*(pelv)|pelv.*(basculacion|inclinacion)/, key: "basculacion pelvica suave" },
  { pattern: /(caminata|caminar|marcha).*(comoda|controlada|suave)|(marcha controlada)/, key: "caminata comoda y controlada" },
];

function normalizeExerciseName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function curatedReference(name: string) {
  const normalizedName = normalizeExerciseName(name);
  const alias = referenceAliases.find(({ pattern }) => pattern.test(normalizedName));
  return references[normalizedName] ?? (alias ? references[alias.key] : undefined);
}

function fallbackReference(name: string) {
  const normalizedName = normalizeExerciseName(name);
  if (/cuello|cervical|nuca/.test(normalizedName)) return references["movilidad cervical en rango comodo"];
  if (/hombro|escapul|brazo|codo|mano|muneca/.test(normalizedName)) return references["control escapular suave"];
  if (/rodilla|cuadriceps|talon|tobillo|pie|pierna/.test(normalizedName)) return references["transferencia de peso con apoyo"];
  if (/cadera|pelv|lumbar|espalda baja/.test(normalizedName)) return references["basculacion pelvica suave"];
  if (/torax|toracic|espalda alta/.test(normalizedName)) return references["movilidad toracica con apoyo"];
  if (/respir|relaja/.test(normalizedName)) return references["respiracion diafragmatica y relajacion"];
  return references["caminata comoda y controlada"];
}

function referenceForSex(reference: ExerciseReference, biologicalSex?: "femenino" | "masculino") {
  if (!biologicalSex) return reference;
  return { ...reference, image: reference.image.replace("/exercises/", `/exercises/${biologicalSex}/`) };
}

export function hasCuratedExerciseReference(name: string) {
  return Boolean(curatedReference(name));
}

export function getExerciseReference(name: string, biologicalSex?: "femenino" | "masculino") {
  const exact = curatedReference(name);
  if (exact) return { ...referenceForSex(exact, biologicalSex), isFallback: false };
  return { ...referenceForSex(fallbackReference(name), biologicalSex), isFallback: true };
}
