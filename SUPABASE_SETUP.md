# Activar autenticación y datos persistentes

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor.
3. Copiar `.env.example` como `.env.local` y completar URL + clave anónima.
4. En Authentication, habilitar correo/contraseña y configurar Google/Apple cuando se tengan sus credenciales OAuth.
5. Los SDK oficiales ya están instalados. Los clientes están en `lib/supabase/`.

El esquema aplica Row Level Security: una persona únicamente puede consultar y modificar sus propios perfil, planes, sesiones y registros.
