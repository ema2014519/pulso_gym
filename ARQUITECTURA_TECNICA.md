# Arquitectura técnica propuesta

## Decisión

Para el MVP se propone una arquitectura web monolítica modular:

- **Frontend y capa de servidor:** Next.js con App Router y TypeScript.
- **Interfaz:** React, CSS con variables de diseño y componentes accesibles.
- **Datos y autenticación:** Supabase (PostgreSQL, Auth y almacenamiento de archivos opcional).
- **Aplicación instalable:** manifest, service worker y caché selectiva como PWA.
- **Despliegue:** plataforma compatible con Next.js; se elegirá antes de producción según coste, región y requisitos de privacidad.

Next.js documenta soporte para construir PWA, incluyendo manifest, notificaciones push y service worker. [Documentación de Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps) Supabase ofrece autenticación por contraseña y proveedores Google/Apple, con PostgreSQL y controles de acceso por fila. [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)

## Estructura propuesta

```text
app/
├── (public)/                 # acceso, registro y recuperación
├── (app)/                    # áreas autenticadas
│   ├── inicio/
│   ├── plan/
│   ├── alimentacion/
│   ├── progreso/
│   └── perfil/
├── api/                      # endpoints que requieran lógica de servidor
└── offline/                  # estado y ayuda sin conexión

components/                   # componentes de interfaz reutilizables
features/                     # dominio: perfil, plan, sesión, progreso
lib/                          # cliente de datos, validaciones y utilidades
public/                       # iconos, manifest y recursos PWA
```

## Módulos de dominio

| Módulo | Responsabilidad |
| --- | --- |
| Identidad | sesión, proveedores de acceso, consentimiento y recuperación |
| Perfil | objetivo, disponibilidad, restricciones, preferencias e inventario |
| Catálogo | ejercicios, patrones de movimiento, instrucciones y equivalencias |
| Planificación | plan semanal, sesiones y cambio de contexto gimnasio/casa |
| Registro | series, carga, repeticiones, esfuerzo, dolor y finalización |
| Progreso | tendencias, adherencia, check-ins y explicaciones de ajustes |
| Protocolos | reglas versionadas, fuentes científicas y controles de vigencia |

## Seguridad y privacidad

- Aplicar autorización por fila para que una persona solo pueda acceder a sus propios datos.
- Validar datos en cliente para experiencia y en servidor para seguridad.
- Separar secretos y credenciales de las variables expuestas al navegador.
- Registrar consentimiento, versión de políticas y solicitudes de eliminación/exportación.
- Evitar guardar datos de salud no necesarios para el funcionamiento declarado.
- No ejecutar recomendaciones médicas automáticas.

## Estrategia offline

1. Cachear la interfaz y la rutina activa del usuario tras autenticarse.
2. Guardar registros de series y check-ins pendientes en almacenamiento local cifrado cuando sea viable.
3. Enviar una cola de cambios al recuperar conexión.
4. Usar identificadores idempotentes para impedir duplicados durante la sincronización.
5. Informar claramente cuándo un registro está pendiente de sincronizar.

## Autenticación inicial

- Correo y contraseña, con verificación de correo y recuperación.
- OAuth con Google.
- OAuth con Apple.
- No crear perfiles ni planes hasta aceptar términos y política de privacidad.

## Criterios de calidad antes de desarrollar funciones

- TypeScript estricto, linting y formato automático.
- Pruebas unitarias de reglas de dominio y validaciones.
- Pruebas de integración para autenticación, autorización y cambio de contexto de sesión.
- Pruebas de accesibilidad de flujos principales.
- Prueba manual en navegador móvil y escritorio, en línea y sin conexión.

## Decisiones que se dejan para después del MVP

- Aplicación nativa independiente para Android/iOS.
- Wearables y HealthKit/Google Health Connect.
- Motor de recomendaciones basado en modelos generativos.
- Procesamiento de fotografías de alimentos.
