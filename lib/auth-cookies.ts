// Sesión del cliente = DOS cookies httpOnly (el navegador nunca ve ningún token):
//
//  - SESSION_COOKIE: el JWT de acceso que emite homex-api (dura 5 minutos). path "/", SameSite=Lax. Su maxAge es lo que le
//    queda al JWT, así que el navegador la borra sola cuando vence.
//  - REFRESH_COOKIE: el refresh token (homex-api lo guarda hasta 7 días y lo ROTA en cada renovación) junto con la cédula con
//    que se inició sesión, que homex-api necesita para renovar. SameSite=Strict y path restringido a "/api": solo viaja a las
//    rutas del servidor (las páginas no la reciben) y nunca en navegaciones desde otros sitios.
//
// Con el JWT vencido, las rutas de /app/api renuevan en silencio con el refresh (ver lib/session.ts).
export const SESSION_COOKIE = "mercasa_session";
export const REFRESH_COOKIE = "mercasa_refresh";

// Techo por si el backend no manda `expiresAtUtc` (ver AuthController.cs,
// GetJwtExpiration puede devolver null con un JWT de formato inesperado):
// misma duración que ya usa homex-web para su access token.
export const SESSION_MAX_AGE_FALLBACK = 60 * 5;

// Duración de la cookie del refresh. homex-api NO la devuelve (TokensResponseDto.RefreshTokenExpiration tiene [JsonIgnore]):
// es su Jwt:RefreshExpirationMinutes (10080 = 7 días). Si allá cambia, se ajusta aquí con SESSION_REFRESH_MAX_AGE_SECONDS.
export const REFRESH_MAX_AGE_DEFAULT = 60 * 60 * 24 * 7;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api",
};

// ¿Hay algo con qué tener sesión? El JWT vencido desaparece del navegador, pero con el refresh todavía se puede renovar.
export function hasSessionCookies(store: { get(name: string): { value: string } | undefined }): boolean {
  return Boolean(store.get(SESSION_COOKIE)?.value || store.get(REFRESH_COOKIE)?.value);
}
