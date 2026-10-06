import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-cookies";
import type { DirectionInput } from "@/lib/auth-types";

// Alta de dirección de entrega del cliente logueado. Lee el JWT
// de la cookie httpOnly (el navegador nunca lo ve) y lo reenvía a
// mercasa-api POST /api/directions, que llama a homex-api CreateDirection.
// La cédula ya no se manda: homex-api la deriva del AccountNum del JWT.
export async function POST(request: NextRequest) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Iniciá sesión para guardar la dirección." }, { status: 401 });
  }

  let data: DirectionInput;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Validación mínima acá; mercasa-api vuelve a validar todo.
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  if (
    !data.fullName?.trim() ||
    !data.province ||
    !data.canton ||
    !data.district ||
    !data.street?.trim() ||
    !data.address?.trim() ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const apiBase = process.env.MERCASA_API_BASE;
  const apiKey = process.env.MERCASA_API_KEY;

  if (!apiBase || !apiKey) {
    console.error("[directions] Falta configurar MERCASA_API_BASE/MERCASA_API_KEY");
    return NextResponse.json({ error: "No se pudo guardar la dirección en este momento." }, { status: 502 });
  }

  try {
    const upstream = await fetch(`${apiBase}/api/directions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        Authorization: `Bearer ${token}`,
      },
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
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({ error: "No se pudo guardar la dirección." }));
      return NextResponse.json(body, { status: upstream.status === 401 ? 401 : upstream.status === 400 ? 400 : 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[directions] No se pudo contactar a mercasa-api:", error);
    return NextResponse.json({ error: "No se pudo guardar la dirección en este momento." }, { status: 502 });
  }
}
