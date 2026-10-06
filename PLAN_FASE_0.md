# Fase 0 — Definición del producto

## 1. Visión

Crear una aplicación personal de bienestar y gimnasio que ayude a personas adultas a entrenar, alimentarse y sostener hábitos de recuperación de acuerdo con su objetivo, condición física y estilo de vida. Debe funcionar bien tanto desde escritorio como desde móvil mediante una aplicación web responsive e instalable (PWA).

La prioridad no es imponer un plan perfecto, sino proponer el siguiente paso viable y seguro para cada persona.

## 2. Usuario inicial

**Usuario principal (MVP):** adulto de 18 a 45 años, sin una condición médica que requiera supervisión clínica, que entrena o quiere empezar a entrenar entre 2 y 5 días por semana.

**Situaciones que debe contemplar:**

- Poco tiempo disponible (30 a 60 minutos por sesión).
- Entrenamiento en gimnasio, casa o con equipamiento limitado, incluso con cambios de contexto en días concretos.
- Objetivos de pérdida de grasa, ganancia muscular, salud general o creación de hábito.
- Jornadas sedentarias, variaciones de sueño y estrés.
- Preferencias, alergias y presupuesto alimentario.

**Fuera del alcance inicial:** diagnóstico médico, rehabilitación de lesiones, tratamiento de trastornos alimentarios, prescripción para embarazo o enfermedades crónicas sin un profesional responsable.

## 3. Problemas que resolver

1. La persona no sabe qué entrenar hoy ni cómo progresar con seguridad.
2. Los planes genéricos no encajan con su tiempo, equipamiento, energía o experiencia.
3. La alimentación se percibe como rígida o difícil de registrar.
4. El usuario no puede entender si progresa ni por qué cambia el plan.

## 4. Propuesta de valor

Un plan diario personalizado y explicable que combina entrenamiento, alimentación flexible y hábitos de recuperación. Cada ajuste debe indicar su motivo en lenguaje claro.

Ejemplo: “Esta semana mantenemos la carga y reducimos una serie porque reportaste fatiga alta y dormiste menos de lo habitual”.

## 5. Alcance del MVP

### Incluir

- Registro e inicio de sesión.
- Evaluación inicial: objetivo, experiencia, disponibilidad, equipo, actividad diaria, sueño, lesiones declaradas y preferencias alimentarias.
- Rutina inicial personalizada con ejercicios, series, repeticiones, descansos, alternativas y registro de esfuerzo.
- Selector por sesión para realizar la rutina en gimnasio o en casa, sin modificar el plan semanal completo.
- Variante en casa para cada sesión de gimnasio, considerando el equipo disponible del usuario (peso corporal, bandas, mancuernas u otro).
- Objetivos nutricionales orientativos y registro simple de comidas, agua y proteína.
- Check-in diario de energía, sueño, estrés, dolor y adherencia.
- Panel de progreso para móvil y escritorio.
- Explicación de las reglas que generan o ajustan un plan.
- Alertas y derivación cuando el cuestionario identifique riesgos.

### No incluir todavía

- Diagnóstico o tratamiento médico.
- IA conversacional que cree recomendaciones sin reglas validadas.
- Reconocimiento de alimentos por foto.
- Integraciones con relojes inteligentes.
- Comunidad, ranking o gamificación compleja.
- Planes clínicos y rehabilitación.

### Cambio de contexto: gimnasio ↔ casa

El usuario debe poder cambiar el lugar de una sesión específica desde el calendario o desde la rutina del día. La aplicación conservará, en lo posible, el propósito de la sesión (por ejemplo, fuerza de tren inferior, empuje de torso o acondicionamiento) y propondrá sustituciones acordes al tiempo y equipo disponibles.

**Reglas iniciales:**

1. El cambio se aplica solo al día elegido; no reemplaza el plan base del resto de la semana.
2. La variante en casa se adapta al inventario declarado: sin equipo, bandas, mancuernas o banco.
3. Cada ejercicio de gimnasio tendrá alternativas clasificadas por el mismo patrón de movimiento y grupo muscular principal.
4. Se conservará la carga de trabajo mediante repeticiones, tempo, pausas, rango de movimiento o ejercicios unilaterales cuando no haya peso suficiente.
5. El registro de esfuerzo percibido permitirá ajustar la siguiente sesión, sin comparar de forma directa las cargas de máquinas con las de casa.
6. El usuario podrá restaurar la rutina de gimnasio antes de empezar la sesión.

**Ejemplo:** una sesión de sentadilla en máquina, prensa y extensión de cuádriceps puede convertirse en sentadilla búlgara, sentadilla con pausa y zancadas, usando peso corporal, mochila o mancuernas según disponibilidad.

## 6. Principios científicos y de seguridad

1. Las recomendaciones se basarán en guías de actividad física de la OMS, posicionamientos del ACSM para ejercicio y revisiones/posicionamientos de nutrición deportiva.
2. Las reglas del producto deben ser versionadas: fuente, fecha de revisión, población a la que aplica y responsable profesional.
3. La progresión debe considerar adherencia, rendimiento, fatiga, dolor y recuperación; nunca solo peso corporal.
4. No se recomendarán déficits energéticos extremos ni se promoverá culpa por alimentos o resultados.
5. Una señal de riesgo debe detener la automatización y orientar al usuario hacia un profesional.
6. La app debe informar que es una herramienta de bienestar y no sustituye atención médica, nutricional ni fisioterapéutica.

## 7. Requisitos de producto multiplataforma

| Área | Escritorio | Móvil |
| --- | --- | --- |
| Uso principal | Planificar semana, revisar gráficos y configurar perfil | Seguir rutina, registrar comida y completar check-ins |
| Diseño | Dashboard con información comparativa | Flujo de una tarea por pantalla, botones grandes y temporizador |
| Tecnología | Navegador moderno | PWA instalable, notificaciones y rutina reciente disponible offline |
| Datos | Informes y exportación | Captura rápida durante el día |

## 8. Datos mínimos solicitados

| Categoría | Datos | Uso |
| --- | --- | --- |
| Perfil | edad, altura, peso opcional, objetivo | punto de partida y seguimiento |
| Entrenamiento | experiencia, equipo de gimnasio y casa, días y tiempo disponible | seleccionar rutina, alternativas y volumen inicial |
| Salud | lesiones, restricciones y preguntas de alerta | limitar recomendaciones y derivar cuando corresponda |
| Estilo de vida | actividad laboral, sueño, estrés | adaptar carga y objetivos |
| Alimentación | preferencias, alergias, restricciones y presupuesto | proponer opciones realistas |

Solo se recogerán datos necesarios, con consentimiento explícito y opciones para exportarlos o eliminarlos.

## 9. Métricas de éxito del MVP

- Activación: porcentaje de usuarios que termina la evaluación y guarda su primer plan.
- Adherencia: entrenamientos completados por semana y check-ins realizados.
- Retención: usuarios activos al cabo de 1, 4 y 8 semanas.
- Comprensión: porcentaje que declara entender por qué se ajustó su plan.
- Seguridad: alertas atendidas y ausencia de recomendaciones fuera de protocolo.
- Satisfacción: valoración posterior a las primeras dos semanas.

## 10. Criterios para pasar a fase 1

- Usuario objetivo y problema principal confirmados mediante entrevistas o pruebas de prototipo.
- Alcance del MVP aprobado, incluyendo lo que se excluye.
- Cuestionario de seguridad revisado por un profesional cualificado.
- Primera versión de reglas de entrenamiento y nutrición documentada con fuentes.
- Métricas y política de datos acordadas.
- Flujos de escritorio y móvil prototipados.

## 11. Decisiones pendientes

1. **Decidido:** el lanzamiento cubrirá gimnasio y casa, con cambio de contexto por sesión.
2. ¿Cuál será el mercado inicial y qué alimentos/localización debe cubrir?
3. ¿Habrá profesionales asociados desde el lanzamiento o solo contenido revisado externamente?
4. ¿El modelo inicial será gratuito, freemium o suscripción?
5. ¿Qué objetivos tendrán prioridad: pérdida de grasa, ganancia muscular, salud general o todos?
