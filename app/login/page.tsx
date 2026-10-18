"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Dumbbell, LockKeyhole, Mail, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "recovery" | "reset";

async function createServerSession(credentials: { email: string; password: string }) {
  const response = await fetch("/auth/session", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error || "No pudimos guardar la sesión en este navegador.");
  }
}

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sceneTransition = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      const timer = window.setTimeout(() => setMode("reset"), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim().replace(/\s+/g, " ");
    if (mode === "signup" && normalizedName.length < 2) {
      setError("Ingresa tu nombre para personalizar tu espacio.");
      return;
    }
    if (mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    if (mode !== "recovery" && !password) {
      setError("Ingresa tu contraseña.");
      return;
    }
    if ((mode === "signup" || mode === "reset") && password.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await createServerSession({ email: normalizedEmail, password });
        setMessage("Sesión iniciada. Abriendo tu plan…");
        window.location.replace(new URL("/", window.location.origin).href);
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/evaluacion`,
            data: { display_name: normalizedName, full_name: normalizedName },
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          await createServerSession({ email: normalizedEmail, password });
          window.location.replace(new URL("/evaluacion", window.location.origin).href);
          return;
        }
        setMessage("Revisa tu correo y confirma tu cuenta para continuar con tu evaluación.");
        return;
      }

      if (mode === "recovery") {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/login?reset=1`,
        });
        if (recoveryError) throw recoveryError;
        setMessage("Si existe una cuenta con este correo, recibirás un enlace para cambiar tu contraseña.");
        return;
      }

      const { error: resetError } = await supabase.auth.updateUser({ password });
      if (resetError) throw resetError;
      setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
      setPassword("");
      setMode("login");
    } catch (authError) {
      const detail = authError instanceof Error ? authError.message : "";
      if (/invalid login credentials/i.test(detail)) setError("Correo o contraseña incorrectos.");
      else if (/email not confirmed/i.test(detail)) setError("Confirma tu correo antes de iniciar sesión.");
      else if (/failed to fetch|network/i.test(detail)) setError("No pudimos conectar con el servicio de acceso. Revisa tu conexión e inténtalo nuevamente.");
      else setError(detail || "No se pudo completar la operación. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const content = {
    login: { eyebrow: "Tu espacio", title: "Bienvenido de vuelta.", description: "Ingresa para continuar con tu plan de hoy.", submit: "Entrar a mi plan" },
    signup: { eyebrow: "Tu primer paso", title: "Crea tu cuenta.", description: "Empieza una rutina que se adapta a tu vida.", submit: "Crear mi cuenta" },
    recovery: { eyebrow: "Recuperar acceso", title: "Restablece tu acceso.", description: "Te enviaremos un enlace seguro a tu correo.", submit: "Enviar enlace" },
    reset: { eyebrow: "Nueva contraseña", title: "Elige una nueva clave.", description: "Usa al menos 8 caracteres para proteger tu cuenta.", submit: "Guardar contraseña" },
  }[mode];

  return (
    <main className="login-page">
      <section className="login-scene" aria-label="Escena de gimnasio">
        <div className="login-scene-copy">
          <Link className="brand brand-login" href="/" aria-label="Pulso, ir al inicio">
            <span className="brand-mark" aria-hidden="true"><Dumbbell size={19} strokeWidth={2.6} /></span>
            <span>Pulso</span>
          </Link>
          <p className="eyebrow">Entrena con intención</p>
          <h1>Entrena.<br /><em>Mejora.</em><br />Repite.</h1>
          <p className="login-scene-description">Rutinas adaptadas a tu cuerpo, tu tiempo y el lugar donde entrenas hoy.</p>
        </div>

        <motion.div
          className="gym-3d-stage"
          aria-hidden="true"
          initial={{ opacity: 0, y: 42, rotateX: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={sceneTransition}
        >
          <div className="gym-motion-rig">
            <div className="gym-photo" />
            <div className="gym-photo-light" />
            <div className="gym-photo-vignette" />
          </div>
        </motion.div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <Link className="brand login-mobile-brand" href="/" aria-label="Pulso, ir al inicio">
          <span className="brand-mark" aria-hidden="true"><Dumbbell size={18} strokeWidth={2.6} /></span>
          <span>Pulso</span>
        </Link>
        <motion.div
          className="login-card"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...sceneTransition, delay: 0.16 }}
        >
          <Link className="brand login-panel-brand" href="/" aria-label="Pulso, ir al inicio">
            <span className="brand-mark" aria-hidden="true"><Dumbbell size={18} strokeWidth={2.6} /></span>
            <span>Pulso</span>
          </Link>
          <div className="login-card-heading">
            <p className="eyebrow">{content.eyebrow}</p>
            <h2 id="login-title">{content.title}</h2>
            <p>{content.description}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
            {mode === "signup" && <>
              <label htmlFor="name">Tu nombre</label>
              <div className="login-input">
                <UserRound size={18} aria-hidden="true" />
                <input id="name" name="name" type="text" placeholder="Cómo quieres que te llamemos" autoComplete="name" minLength={2} value={name} onChange={(event) => setName(event.target.value)} required disabled={isSubmitting} />
              </div>
            </>}
            {mode !== "reset" && <>
              <label htmlFor="email">Correo electrónico</label>
              <div className="login-input">
                <Mail size={18} aria-hidden="true" />
                <input id="email" name="email" type="email" placeholder="tu@email.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} />
              </div>
            </>}
            {mode !== "recovery" && <>
            <label htmlFor="password">Contraseña</label>
            <div className="login-input">
              <LockKeyhole size={18} aria-hidden="true" />
              <input id="password" name="password" type="password" placeholder="••••••••" autoComplete={mode === "reset" ? "new-password" : mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" || mode === "reset" ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} />
            </div>
            </>}
            {mode === "login" &&
            <div className="login-options">
              <label className="remember-option"><input type="checkbox" name="remember" /> <span>Recordarme</span></label>
              <button className="login-text-button" type="button" onClick={() => changeMode("recovery")}>¿Olvidaste tu contraseña?</button>
            </div>
            }
            {error && <p className="auth-message auth-error" role="alert">{error}</p>}
            {message && <p className="auth-message auth-success" role="status">{message}</p>}
            <button className="button button-primary login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Procesando…" : content.submit} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          {mode === "login" && <p className="login-register">¿Aún no tienes cuenta? <button className="login-text-button" type="button" onClick={() => changeMode("signup")}>Crear mi cuenta</button></p>}
          {mode === "signup" && <p className="login-register">¿Ya tienes cuenta? <button className="login-text-button" type="button" onClick={() => changeMode("login")}>Iniciar sesión</button></p>}
          {(mode === "recovery" || mode === "reset") && <p className="login-register"><button className="login-text-button" type="button" onClick={() => changeMode("login")}>Volver a iniciar sesión</button></p>}
        </motion.div>
      </section>
    </main>
  );
}
