# Wireframes funcionales — Fase 1

Los wireframes describen estructura y comportamiento; el diseño visual (marca, colores y tipografía) se definirá después. Idioma inicial: español.

## Navegación global

**Móvil:** Inicio · Plan · Registrar · Progreso · Perfil

**Escritorio:** barra lateral con Inicio, Mi plan, Alimentación, Progreso y Perfil; panel de contenido a la derecha.

## 1. Acceso y creación de cuenta

```text
┌─────────────────────────────────┐
│             [Logo]              │
│  Tu plan de entrenamiento hoy   │
│                                 │
│ [ Continuar con Google        ] │
│ [ Continuar con Apple         ] │
│             ── o ──             │
│ Correo                          │
│ [                           ]   │
│ Contraseña                      │
│ [                           ]   │
│ [ Iniciar sesión              ] │
│ ¿No tienes cuenta? Crear cuenta │
└─────────────────────────────────┘
```

Al crear una cuenta, el usuario acepta términos y política de privacidad antes de iniciar la evaluación.

## 2. Evaluación inicial

Formato: asistente de pasos cortos, con progreso visible y posibilidad de guardar y continuar luego.

```text
← Evaluación inicial                  Paso 2 de 6
¿Cuál es tu objetivo principal?

[ Ganar fuerza o músculo ]
[ Perder grasa ]
[ Mejorar mi salud y energía ]
[ Crear el hábito de entrenar ]

                         [ Continuar ]
```

Pasos:

1. Objetivo y experiencia previa.
2. Días, duración por sesión y horario habitual.
3. Equipo disponible en gimnasio.
4. Equipo disponible en casa: sin equipo, bandas, mancuernas, banco u otros.
5. Actividad diaria, sueño, estrés y preferencias alimentarias.
6. Filtro de seguridad, consentimiento y resumen.

## 3. Inicio / rutina de hoy

```text
Hola, Ana                         🔔
Lunes, 6 de octubre

┌─────────────────────────────────┐
│ FUERZA · TREN INFERIOR           │
│ Gimnasio · 45 min                │
│ [ Empezar rutina ]               │
│ [ Hoy entreno en casa ]          │
└─────────────────────────────────┘

Tu estado hoy
Sueño  [ Registrar ]  Energía [ Registrar ]

Esta semana
● Lunes   ○ Miércoles   ○ Viernes
3 sesiones planificadas
```

El botón “Hoy entreno en casa” aparece para cualquier sesión de gimnasio y lleva al flujo de variante, sin cambiar las sesiones futuras.

## 4. Cambio de gimnasio a casa

```text
← Entrenar en casa hoy
Mantendremos el objetivo: tren inferior

¿Qué tienes disponible?
[✓] Peso corporal   [✓] Mancuernas
[ ] Bandas          [ ] Banco

Tiempo disponible
[ 30 min ] [ 45 min ] [ 60 min ]

Cambios propuestos
Prensa de piernas → Sentadilla goblet
Extensión de cuádriceps → Zancada búlgara

[ Ver rutina en casa ]
```

Antes de iniciar, se presenta la rutina completa y las razones de las sustituciones. La persona puede volver a la sesión de gimnasio mientras no haya registrado una serie.

## 5. Sesión activa y registro

```text
← 2 de 5                   ⏱ 32:18
Sentadilla goblet
Objetivo: 3 series de 10 a 12
Último registro: 12 rep · 16 kg

Serie  Repeticiones  Carga  Esfuerzo
1      [ 12       ]  [16 ]  [ 7 ] ✓
2      [          ]  [   ]  [   ]
3      [          ]  [   ]  [   ]

[ Ver técnica ] [ Cambiar ejercicio ]
[ Iniciar descanso: 90 s ]
                    [ Siguiente ]
```

En casa, la carga puede ser opcional y el registro de esfuerzo es obligatorio cuando no existe una carga comparable.

## 6. Progreso

```text
Progreso                         Semana ▾

Adherencia        2 / 3 sesiones
Energía promedio  7 / 10

Fuerza              Peso (opcional)
╭─────────────╮     ╭─────────────╮
│ tendencia   │     │ tendencia   │
╰─────────────╯     ╰─────────────╯

Último ajuste
“Mantuvimos la carga porque cumpliste
las repeticiones objetivo.” [ Ver motivo ]
```

## Validación de wireframes

Probar con al menos cinco personas del usuario objetivo y observar si pueden:

1. Crear cuenta y completar evaluación.
2. Identificar y comenzar la rutina del día.
3. Cambiar una única sesión de gimnasio a casa.
4. Registrar un ejercicio y finalizar sesión.
5. Encontrar su progreso y entender el último ajuste.

Se anotarán confusiones, abandono por pantalla y tiempo de finalización para iterar antes de construir la interfaz final.
