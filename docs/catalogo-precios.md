# Precios con sesión del catálogo

`NEXT_PUBLIC_ENABLE_CATALOG_PRICES` controla si la web pide precios y presentaciones con sesión (`POST /api/catalog/prices`). Por defecto está **apagada**: solo el valor `true` la enciende (cualquier otro valor, o que la variable no exista, la deja apagada). Apagada: el navegador no hace llamadas de precios, no sale ningún aviso y los productos se ven como para un cliente sin sesión; la ruta responde 404 sin llamar a `mercasa-api`. Se pone en `true` cuando `homex-api` tenga `Catalog/Prices`. Es una variable de compilación: hay que reiniciar o volver a compilar. `.env.example` no se versiona (está en `.gitignore`), por eso la documentación vive aquí.

Otros valores por defecto cuando la variable no existe: `NEXT_PUBLIC_ENABLE_ORDERING` apagado (solo `true` lo enciende, `lib/feature-flags.ts`) y `SESSION_REFRESH_MAX_AGE_SECONDS` de 604800 s (7 días, `REFRESH_MAX_AGE_DEFAULT` en `lib/auth-cookies.ts`).
