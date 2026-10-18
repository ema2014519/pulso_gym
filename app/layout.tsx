import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "./service-worker-register";
import { MotionProvider } from "./motion-provider";
import { InstallApp } from "./install-app";

export const metadata: Metadata = {
  title: "Pulso | Tu plan de hoy",
  description: "Entrenamiento y hábitos adaptados a tu vida.",
  applicationName: "Pulso",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pulso",
  },
  icons: {
    icon: [
      { url: "/api/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { url: "/api/pwa-icon/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/api/pwa-icon/180", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#080b0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        <MotionProvider>{children}</MotionProvider>
        <InstallApp />
      </body>
    </html>
  );
}
