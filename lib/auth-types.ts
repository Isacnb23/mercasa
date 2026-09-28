// Credenciales que acepta homex-api: el "usuario" es la cédula (VATNUM),
// no un email. homex-api la normaliza internamente (con o sin guiones), no
// hace falta validar/formatear el formato del lado del cliente.
export interface LoginCredentials {
  userId: string;
  password: string;
}

// Se extraen decodificando los claims del JWT en el servidor (ver lib/jwt.ts)
// — el token en sí nunca llega al cliente, solo estos datos ya derivados.
export interface AuthUser {
  accountNum: string;
  name: string;
  email: string;
}
