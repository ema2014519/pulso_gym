# Activar autenticación y datos persistentes

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor.
3. Copiar `.env.example` como `.env.local` y completar URL + clave anónima.
4. En Authentication, habilitar correo/contraseña y configurar Google/Apple cuando se tengan sus credenciales OAuth.
5. Los SDK oficiales ya están instalados. Los clientes están en `lib/supabase/`.

El esquema aplica Row Level Security: una persona únicamente puede consultar y modificar sus propios perfil, planes, sesiones y registros.

## Recordatorios en celular

1. En un proyecto existente, ejecutar `supabase/migrations/20261018000000_workout_reminders.sql`.
2. Generar claves con `npx web-push generate-vapid-keys`.
3. Completar en `.env.local` y en producción: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET`.
4. En producción, Supabase Cron consulta `GET /api/reminders/dispatch` cada cinco minutos usando `Authorization: Bearer <CRON_SECRET>`. El secreto se guarda en Supabase Vault y en las variables protegidas del proveedor web; nunca debe incluirse en el repositorio.

En Android funciona desde navegadores compatibles con Web Push. En iPhone/iPad, Pulso debe agregarse a la pantalla de inicio antes de solicitar permiso.

## Actualizar un proyecto existente

Si el proyecto ya fue creado con el esquema inicial, ejecutar en el SQL Editor:

`supabase/migrations/20261006_multiple_plans_and_assessment.sql`

La migración conserva los datos existentes y habilita nombres de plan, varios planes por usuario, la fotografía de cada evaluación y los objetivos nutricionales.
