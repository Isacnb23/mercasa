import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";
import { isValidAddressId } from "@/lib/addresses-edit";
import type { DirectionInput } from "@/lib/auth-types";

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_TEXT = 200;

const unavailable = (code: "service_unavailable" | "aif_unavailable" = "service_unavailable") =>
  NextResponse.json(
    { code, message: "No pudimos guardar los cambios ahora. Intentá de nuevo en unos minutos." },
    { status: 503, headers: NO_STORE },
  );

// Modifica una dirección del cliente con sesión. Lee el JWT de la cookie httpOnly (el navegador nunca lo ve) y lo reenvía a
// mercasa-api PUT /api/directions/{id}; homex-api comprueba que la dirección sea de la cuenta del JWT (404 si no, igual que
// si no existe). El id y el cuerpo que manda el navegador NO son verdad: aquí solo se valida el formato. Ni la cédula ni la
// compañía ni la cuenta se pueden mandar. Nada del cuerpo se registra.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Iniciá sesión para guardar los cambios." }, { status: 401, headers: NO_STORE });
  }

  const { id } = await params;
  if (!isValidAddressId(id)) {
    return NextResponse.json({ code: "validation_failed", message: "Dirección inválida." }, { status: 400, headers: NO_STORE });
  }

  let data: DirectionInput;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ code: "validation_failed", message: "Solicitud inválida." }, { status: 400, headers: NO_STORE });
  }

  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  const texts = [data.fullName, data.province, data.canton, data.district, data.city, data.street, data.address, data.postalName];
  if (
    !data.fullName?.trim() ||
    !data.province ||
    !data.canton ||
    !data.district ||
    !data.street?.trim() ||
    !data.address?.trim() ||
    texts.some((value) => typeof value === "string" && value.length > MAX_TEXT) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return NextResponse.json({ code: "validation_failed", message: "Revisá los datos de la dirección." }, { status: 400, headers: NO_STORE });
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;
  if (!apiBase || !apiKey) {
    console.error("[directions-update] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY");
    return unavailable();
  }

  try {
    const upstream = await fetch(`${apiBase}/api/directions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        fullName: data.fullName.trim(),
        country: "Costa Rica",
        province: data.province,
        canton: data.canton,
        district: data.district,
        city: data.city ?? "",
        street: data.street.trim(),
        address: data.address.trim(),
        postalName: data.postalName?.trim() || data.address.trim(),
        latitude,
        longitude,
      }),
      cache: "no-store",
      // Mayor que el timeout de mercasa-api (10 s) para que llegue su 503 antes de rendirnos.
      signal: AbortSignal.timeout(20_000),
    });

    if (upstream.ok) return NextResponse.json({ ok: true }, { headers: NO_STORE });

    if (upstream.status === 401) return NextResponse.json({ error: "Sesión requerida." }, { status: 401, headers: NO_STORE });
    if (upstream.status === 404) return NextResponse.json({ code: "not_found", message: "No encontramos esa dirección." }, { status: 404, headers: NO_STORE });
    if (upstream.status === 400) return NextResponse.json({ code: "validation_failed", message: "Revisá los datos de la dirección." }, { status: 400, headers: NO_STORE });

    if (upstream.status === 503) {
      const body = (await upstream.json().catch(() => null)) as { code?: unknown } | null;
      return unavailable(body?.code === "aif_unavailable" ? "aif_unavailable" : "service_unavailable");
    }

    console.error(`[directions-update] mercasa-api respondió ${upstream.status}`);
    return unavailable();
  } catch (error) {
    console.error("[directions-update] No se pudo contactar a mercasa-api:", error instanceof Error ? error.name : "error");
    return unavailable();
  }
}
