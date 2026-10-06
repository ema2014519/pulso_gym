# Fase 1 — Diseño y base técnica

## Objetivo

Definir una base multiplataforma que permita usar el mismo producto en escritorio y móvil, con una experiencia adaptada a cada contexto. Esta fase termina con arquitectura aprobada, prototipos navegables y contratos de datos; no con todas las funciones de entrenamiento o nutrición terminadas.

## Decisión técnica propuesta

Construir una aplicación web responsive instalable como **PWA**.

- Un único frontend para navegador de escritorio y móvil.
- Diseño *mobile-first* para los flujos rápidos durante el entrenamiento.
- Panel más amplio en escritorio para planificación, configuración y progreso.
- Caché de la rutina activa y registro local temporal para poder entrenar con conectividad limitada.
- Sincronización al recuperar conexión, evitando duplicar registros.

La elección concreta de framework se tomará antes de iniciar desarrollo; como referencia, una aplicación React/Next.js con TypeScript, una API segura y base de datos relacional satisface estos requisitos.

## Roles iniciales

| Rol | Capacidades |
| --- | --- |
| Usuario | Gestionar perfil, planes, sesiones, registros y privacidad |
| Administrador de contenido | Mantener ejercicios, sustituciones y protocolos validados |
| Profesional revisor (futuro controlado) | Revisar reglas y contenido; sin acceso a datos personales sin consentimiento |

## Arquitectura funcional

```text
PWA responsive
├── Perfil y consentimiento
├── Plan semanal
│   ├── Sesión de gimnasio
│   └── Variante por sesión en casa
├── Registro de entrenamiento
├── Alimentación y hábitos
├── Progreso
└── Seguridad / alertas

API
├── Autenticación y autorización
├── Motor de planes basado en reglas versionadas
├── Catálogo de ejercicios y equivalencias
├── Registros del usuario
└── Auditoría y consentimiento

Base de datos
├── Datos de cuenta y preferencias
├── Planes y sesiones
├── Ejercicios y alternativas
├── Registros de progreso
└── Versiones de protocolos científicos
```

## Flujos prioritarios

### 1. Registro y evaluación inicial

1. La persona crea su cuenta y acepta los términos de privacidad.
2. Indica objetivo, experiencia, días disponibles, duración por sesión y contexto habitual.
3. Declara equipo de gimnasio y de casa por separado.
4. Responde el filtro de seguridad y, si hay una alerta, recibe una orientación adecuada.
5. Recibe un plan inicial al comenzar la fase 2.

### 2. Cambio de contexto por sesión

1. En el calendario, el usuario abre una sesión planificada para gimnasio.
2. Pulsa “Entrenar en casa hoy”.
3. Selecciona o confirma equipo disponible y duración.
4. La app muestra una variante equivalente, conservando el objetivo de la sesión.
5. Al finalizar, registra el esfuerzo; el plan base de los demás días no se altera.
6. Puede restaurar la sesión de gimnasio antes de iniciarla.

### 3. Entrenamiento móvil

1. Abrir “Rutina de hoy”.
2. Ver un ejercicio y una acción principal por pantalla.
3. Registrar series, repeticiones, carga y esfuerzo.
4. Usar temporizador de descanso.
5. Finalizar y sincronizar el resumen.

### 4. Planificación en escritorio

1. Ver semana completa, adherencia y contexto de cada sesión.
2. Modificar disponibilidad, equipo y preferencias.
3. Consultar progreso y motivos de los ajustes del plan.

## Diseño responsive

| Área | Móvil | Escritorio |
| --- | --- | --- |
| Navegación | Barra inferior: inicio, plan, registrar, progreso, perfil | Barra lateral y panel de contenido |
| Rutina | Una tarea por pantalla; controles táctiles grandes | Vista de sesión completa y comparación con historial |
| Calendario | Lista por día | Semana completa con arrastrar/consultar detalles |
| Progreso | Indicadores resumidos | Gráficos, tendencias y filtros |
| Alimentación | Registro rápido | Configuración, recetas y lista de compras |

## Modelo de datos mínimo

| Entidad | Campos clave |
| --- | --- |
| Usuario | id, correo, zona horaria, consentimiento, fecha de creación |
| Perfil | objetivo, experiencia, disponibilidad, restricciones, preferencias |
| Inventario de equipo | usuario, contexto (`gym` o `casa`), equipo y cantidad opcional |
| Plan semanal | usuario, versión de protocolo, fechas, objetivo y estado |
| Sesión | plan, fecha, contexto base, objetivo muscular y duración |
| Variante de sesión | sesión, contexto alternativo, equipo requerido y ejercicios propuestos |
| Ejercicio | patrón de movimiento, músculos, instrucciones, contraindicaciones y alternativas |
| Registro de sesión | sesión, variante usada, series, repeticiones, carga, esfuerzo, dolor y fecha |
| Check-in | sueño, estrés, energía, dolor y adherencia |
| Regla/protocolo | versión, fuente, población, criterio, revisor y fecha de vigencia |

## Reglas de UX y seguridad

- No solicitar datos de salud que no tengan una función concreta.
- Mostrar la razón de toda adaptación automática.
- Pedir confirmación antes de sobrescribir una sesión iniciada.
- Guardar borradores de registros localmente si no hay conexión.
- Mantener accesibilidad: contraste suficiente, controles táctiles de tamaño adecuado, teclado y lector de pantalla.
- Separar claramente recomendaciones de bienestar de la atención clínica.

## Entregables de la fase

1. Mapa de navegación de escritorio y móvil.
2. Wireframes de evaluación inicial, rutina diaria, cambio a casa, registro de sesión y dashboard.
3. Esquema de datos inicial.
4. Decisión documentada de stack y proveedor de autenticación/base de datos.
5. Prototipo navegable probado con usuarios.
6. Backlog priorizado para la fase 2.

## Criterios para pasar a fase 2

- Un usuario puede recorrer el prototipo desde registro hasta completar una sesión en gimnasio o casa.
- El cambio de contexto por día es entendible sin explicación externa.
- Los requisitos de PWA, sincronización y privacidad están especificados.
- Modelo de datos revisado y suficiente para preservar historial y versiones de planes.
- Las pruebas de prototipo no muestran bloqueos críticos de uso.

## Decisiones aún necesarias

1. **Decidido:** idioma inicial español. El diseño debe prepararse para traducciones futuras.
2. **Decidido:** acceso con correo/contraseña y proveedores sociales Google y Apple.
3. Mercado inicial y configuración de alimentos/unidades regionales.
4. Presupuesto y plazo objetivo para el MVP.
5. Equipo técnico disponible y tecnología preferida, si existe.
