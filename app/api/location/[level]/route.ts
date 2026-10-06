import { NextRequest, NextResponse } from "next/server";

// Dropdowns geográficos (País → Provincia → Cantón → Distrito → Ciudad) para
// el formulario de dirección. Reenvía a mercasa-api /api/location/{level}
// (que a su vez lee de homex-api/AX): el navegador nunca conoce
// MERCASA_API_KEY ni la URL del backend. No requiere sesión — es geografía
// pública y mercasa-api ya cachea y limita por IP.
const LEVEL_PARAMS: Record<string, string[]> = {
  countries: [],
  provinces: ["countryId"],
  cantons: ["countryId", "provinceId"],
  districts: ["countryId", "provinceId", "cantonId"],
  cities: ["countryId", "provinceId", "cantonId", "districtId"],
};

// Los ids de AX son códigos cortos alfanuméricos.
const SAFE_ID = /^[A-Za-z0-9_.-]{1,20}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ level: string }> }
) {
  const { level } = await params;
  const required = LEVEL_PARAMS[level];

  if (!required) {
    return NextResponse.json({ error: "Nivel inválido" }, { status: 404 });
  }

  const query = new URLSearchParams();
  for (const name of required) {
    const value = request.nextUrl.searchParams.get(name);
    if (!value || !SAFE_ID.test(value)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    query.set(name, value);
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error("[location] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY");
    return NextResponse.json({ error: "No se pudieron cargar las ubicaciones." }, { status: 502 });
  }

  const qs = query.toString();
  try {
    const upstream = await fetch(`${apiBase}/api/location/${level}${qs ? `?${qs}` : ""}`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "No se pudieron cargar las ubicaciones." },
        { status: upstream.status === 400 ? 400 : 502 }
      );
    }

    return NextResponse.json(await upstream.json());
  } catch (error) {
    console.error("[location] No se pudo contactar a mercasa-api:", error);
    return NextResponse.json({ error: "No se pudieron cargar las ubicaciones." }, { status: 502 });
  }
}
