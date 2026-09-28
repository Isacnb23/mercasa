// Una sola cookie con el JWT crudo que devuelve mercasa-api (POST
// /api/auth/login) — a diferencia de homex-web no hay refresh token en este
// contrato (mercasa-api/AuthController solo expone login), así que no hace
// falta una segunda cookie ni lógica de refresh.
export const SESSION_COOKIE = "mercasa_session";

// Techo por si el backend no manda `expiresAtUtc` (ver AuthController.cs,
// GetJwtExpiration puede devolver null con un JWT de formato inesperado):
// misma duración que ya usa homex-web para su access token.
export const SESSION_MAX_AGE_FALLBACK = 60 * 5;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
