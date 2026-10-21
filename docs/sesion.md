# Sesión del cliente (mercasacr.com)

La sesión ya no muere a los 5 minutos: el JWT de acceso se renueva solo, en el servidor, con un refresh token. El navegador nunca ve ningún token.

## Duraciones y cookies

| Cookie | Contenido | Duración | Atributos |
|---|---|---|---|
| `mercasa_session` | JWT de acceso de `homex-api` | 5 minutos (lo que le quede al JWT) | httpOnly, Secure (producción), SameSite=Lax, path `/` |
| `mercasa_refresh` | cédula con que se inició sesión + refresh token (en base64url) | 7 días (`SESSION_REFRESH_MAX_AGE_SECONDS`, por defecto 604800) | httpOnly, Secure (producción), **SameSite=Strict**, **path `/api`** |

- La cookie del refresh solo viaja a las rutas `/api/*` (las páginas no la reciben) y nunca en navegaciones desde otros sitios. Ninguna es accesible desde JavaScript.
- La cédula va en la cookie porque `homex-api` guarda la sesión por la cédula **tal como se escribió al iniciar sesión** (`CUSTSESSIONS.CUSTACCOUNT`) y la pide para renovar.
- `homex-api` **no devuelve** la caducidad del refresh (`TokensResponseDto.RefreshTokenExpiration` tiene `[JsonIgnore]`): los 7 días son su `Jwt:RefreshExpirationMinutes` (10080). Si allá cambia, ajustar `SESSION_REFRESH_MAX_AGE_SECONDS`.

## Flujo

1. **Inicio de sesión** (`POST /api/auth/login`): manda la IP real del visitante en `X-Client-Ip` (igual que el registro) a `mercasa-api`, que la reenvía a `homex-api`. Guarda las dos cookies. Un 429 (demasiados intentos por IP o por cédula) llega a la pantalla con `Retry-After`.
2. **Uso normal**: cada ruta de `/api` pide el JWT con `sessionGate()` (`lib/session.ts`). Si queda más de 30 s de vida lo usa; si venció (ya no está en el navegador), está por vencer, o el servidor responde 401, **renueva una vez** con `mercasa-api` `POST /api/auth/refresh` y repite la misma petición (`withSessionRetry`). Repetir es seguro: un 401 significa que no se procesó nada (también para el pedido).
3. **Un solo refresh a la vez**: `homex-api` **rota** el refresh (el anterior deja de servir en cuanto se renueva). Por eso las peticiones simultáneas de una sesión comparten una sola renovación, y el resultado se recuerda 60 s en memoria para la petición que ya salió con la cookie vieja (`createRefresher`, `lib/session-core.ts`). Solo lo recibe quien presenta el refresh viejo.
4. **Si el refresh ya no sirve** (vencido, inválido, ya usado, revocado por un cambio de contraseña, o se inició sesión en otro equipo: ver pendientes): se borran las **dos** cookies y la ruta responde 401 con `code: "session_expired"`. El navegador (`lib/auth-context.tsx` + `lib/session-client.ts`) ve el 401, limpia la sesión, abre el perfil con "Tu sesión expiró, iniciá sesión de nuevo" y **no toca el carrito** (vive en `localStorage`). La persona queda en la misma pantalla (por ejemplo el checkout) y, al volver a entrar, continúa.
5. **Fallo transitorio de la renovación** (servicio caído, límite): las cookies **no** se borran; si el JWT aún sirve se usa, si no la ruta responde 503 `service_unavailable` o 429 con `Retry-After`. No se muestra "sesión vencida".
6. **Al volver a la pestaña** el navegador consulta `GET /api/auth/session`, que también renueva en silencio.
7. **Cerrar sesión** (`POST /api/auth/logout`): borra las dos cookies. Solo acepta peticiones del mismo sitio.
8. **Renovación explícita** (`POST /api/auth/refresh`): fuerza la renovación y devuelve `{ user }` (nunca tokens). Exige mismo sitio (`Sec-Fetch-Site: same-origin` o, si falta, `Origin` igual al host) y responde 403 si no. La interfaz no la usa hoy: queda disponible.

## Respuestas de error

`401 session_expired` · `401` sin code (no había sesión) · `429 rate_limited` con `Retry-After` · `503 service_unavailable`. Nunca detalles internos, nunca tokens, nada se registra (`session*.ts` no usan `console`).

## Pendiente

| Qué | Responsable |
|---|---|
| **`homex-api` no ofrece revocar una sesión** (no hay logout ni borrado de `CUSTSESSIONS` por API). Cerrar sesión borra las cookies, pero el refresh de ese equipo sigue vigente en `homex-api` hasta que venza o se cambie la contraseña. Se necesita un endpoint de logout allá | Luis / Fabián (cambio en `homex-api`) |
| `homex-api` guarda **una sola sesión por cédula y app** (`CUSTSESSIONS`): iniciar sesión en otro equipo reemplaza el refresh del primero, que al renovar recibirá `session_expired`. Además, escribir la cédula con o sin guiones crea filas distintas | Luis / Fabián (decisión) |
| `RefreshCredentials` en `homex-api` no tiene límite de tasa propio (los límites de renovación están en `mercasa-api`) | Luis / Fabián |
| La caducidad real del refresh no la devuelve `homex-api` | Luis / Fabián |
| La renovación única y el caché de gracia son **en memoria del proceso**: con más de una instancia de la web, dos peticiones simultáneas que lleguen a instancias distintas renovarían con el mismo refresh y una fallaría. Con una sola instancia no hay problema | Infraestructura |
| Confirmar que el proxy de la web sobrescribe `X-Forwarded-For` (de ahí sale la IP del visitante; si no, se podría falsear) | Luis / Fabián |
| Prueba visual: iniciar sesión, esperar más de 5 minutos con el checkout abierto y seguir; cerrar sesión; clave mal puesta varias veces | Isaac |

## Archivos

`lib/auth-cookies.ts` (nombres y atributos) · `lib/session-core.ts` (lógica pura y probada) · `lib/session.ts` (conexión con las cookies de Next) · `lib/session-client.ts` (aviso en el navegador) · `lib/client-ip.ts` · `app/api/auth/{login,logout,session,refresh}` · pruebas en `lib/__tests__/session.test.mjs`.
