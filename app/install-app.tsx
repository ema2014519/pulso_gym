"use client";

import { Check, Download, MoreVertical, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type InstallMode = "hidden" | "native" | "ios" | "manual";

const DISMISS_KEY = "pulso-install-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isMobileDevice() {
  return window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
}

export function InstallApp() {
  const [mode, setMode] = useState<InstallMode>("hidden");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_FOR_MS) return;

    const ios = isIosDevice();
    const fallbackTimer = window.setTimeout(() => {
      if (isMobileDevice()) setMode((current) => current === "hidden" ? (ios ? "ios" : "manual") : current);
    }, 1800);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setMode("native");
    };

    const handleInstalled = () => {
      setPromptEvent(null);
      setInstructionsOpen(false);
      setMode("hidden");
      setStatus("Pulso quedó instalada correctamente.");
      window.localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setInstructionsOpen(false);
    setMode("hidden");
  };

  const install = async () => {
    if (!promptEvent) {
      setInstructionsOpen(true);
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);

    if (choice.outcome === "accepted") {
      setMode("hidden");
      setStatus("Instalación aceptada. Pulso aparecerá en tu pantalla de inicio.");
    } else {
      setMode(isIosDevice() ? "ios" : "manual");
      setStatus("La instalación se canceló. Puedes intentarlo de nuevo desde el menú del navegador.");
    }
  };

  return (
    <>
      {mode !== "hidden" ? (
        <aside className="install-banner" aria-label="Instalar Pulso">
          <span className="install-banner-icon" aria-hidden="true"><Smartphone size={22} /></span>
          <span className="install-banner-copy">
            <strong>Instala Pulso</strong>
            <small>Acceso rápido y experiencia de app en tu celular.</small>
          </span>
          <button className="install-banner-action" type="button" onClick={() => void install()}>
            <Download size={18} aria-hidden="true" />
            {mode === "native" ? "Instalar" : "Ver pasos"}
          </button>
          <button className="install-banner-close" type="button" onClick={dismiss} aria-label="Ocultar aviso de instalación">
            <X size={19} aria-hidden="true" />
          </button>
        </aside>
      ) : null}

      {instructionsOpen ? (
        <div className="install-sheet-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setInstructionsOpen(false);
        }}>
          <section className="install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-sheet-title">
            <header>
              <span className="install-sheet-icon" aria-hidden="true"><Smartphone size={25} /></span>
              <div>
                <p className="eyebrow">Instalación móvil</p>
                <h2 id="install-sheet-title">Lleva Pulso a tu pantalla de inicio</h2>
              </div>
              <button type="button" onClick={() => setInstructionsOpen(false)} aria-label="Cerrar instrucciones">
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            {mode === "ios" ? (
              <ol className="install-steps">
                <li><span><Share size={20} aria-hidden="true" /></span><p>Toca <strong>Compartir</strong> en la barra de Safari.</p></li>
                <li><span><PlusSquare size={20} aria-hidden="true" /></span><p>Selecciona <strong>Agregar a pantalla de inicio</strong>.</p></li>
                <li><span><Check size={20} aria-hidden="true" /></span><p>Confirma con <strong>Agregar</strong>. Pulso abrirá como una app.</p></li>
              </ol>
            ) : (
              <ol className="install-steps">
                <li><span><MoreVertical size={20} aria-hidden="true" /></span><p>Abre el <strong>menú del navegador</strong>.</p></li>
                <li><span><Download size={20} aria-hidden="true" /></span><p>Toca <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</p></li>
                <li><span><Check size={20} aria-hidden="true" /></span><p>Confirma la instalación para usar Pulso sin la barra del navegador.</p></li>
              </ol>
            )}

            <p className="install-sheet-note">La instalación no ocupa una tienda y conserva tu sesión de Pulso.</p>
            <button className="button button-primary install-sheet-done" type="button" onClick={() => setInstructionsOpen(false)}>Entendido</button>
          </section>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">{status}</p>
    </>
  );
}
