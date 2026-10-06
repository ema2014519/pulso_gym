import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./service-worker-register";

export const metadata: Metadata = {
  title: "Pulso | Tu plan de hoy",
  description: "Entrenamiento y hábitos adaptados a tu vida.",
  applicationName: "Pulso",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#146C5B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
