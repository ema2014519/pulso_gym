import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pulso — Entrenamiento y recuperación",
    short_name: "Pulso",
    description: "Planes personalizados de entrenamiento, recuperación y nutrición.",
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "es",
    display: "standalone",
    orientation: "any",
    background_color: "#080b0d",
    theme_color: "#080b0d",
    categories: ["fitness", "health", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/api/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/pwa-icon/512?maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Mi plan",
        short_name: "Plan",
        description: "Ver tus planes activos",
        url: "/plan",
        icons: [{ src: "/api/pwa-icon/192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Hablar con la IA",
        short_name: "Evaluación",
        description: "Iniciar una evaluación conversacional",
        url: "/evaluacion-asistida",
        icons: [{ src: "/api/pwa-icon/192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
