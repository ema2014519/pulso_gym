import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const SUPPORTED_SIZES = new Set([180, 192, 512]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: rawSize } = await params;
  const size = Number(rawSize);

  if (!SUPPORTED_SIZES.has(size)) {
    return new Response("Tamaño no disponible", { status: 404 });
  }

  const maskable = new URL(request.url).searchParams.has("maskable");
  const inset = maskable ? "16%" : "8%";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080b0d",
          padding: inset,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "28%",
            background: "linear-gradient(145deg, #fb923c, #f97316 58%, #c2410c)",
            boxShadow: "inset 0 0 0 3px rgba(255,255,255,.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "62%",
              height: "62%",
              borderRadius: "50%",
              background: "#101315",
              color: "#f8fafc",
              fontFamily: "Arial, sans-serif",
              fontSize: size * 0.38,
              fontWeight: 900,
              letterSpacing: "-0.08em",
              paddingRight: size * 0.025,
            }}
          >
            P
          </div>
          <div style={{ position: "absolute", left: "15%", top: "47%", width: "18%", height: "6%", borderRadius: 999, background: "#d9f99d" }} />
          <div style={{ position: "absolute", right: "15%", top: "47%", width: "18%", height: "6%", borderRadius: 999, background: "#d9f99d" }} />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
