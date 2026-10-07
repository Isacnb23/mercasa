// Reglas de validación del formulario de Reclutamiento, compartidas por el cliente
// (components/layout/RecruitmentPopover.tsx) y el servidor (app/api/careers/route.ts)
// para que no puedan divergir. El servidor responde 400 genérico; el cliente traduce
// cada código a un mensaje por campo.

export const RECRUIT_LIMITS = {
  nameMin: 3,
  nameMax: 100,
  emailMax: 254,
  phoneMax: 20,
  positionMax: 100,
  cantonMax: 100,
  messageMax: 2000,
  cvMaxBytes: 5 * 1024 * 1024, // 5MB (mismo tope que GI.Recruit.API)
};

export const PHONE_PATTERN = /^\d{4}-\d{4}$/; // mismo patrón que CrearPostulacionRequest
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RecruitField = "name" | "email" | "phone" | "position" | "canton" | "message" | "cv" | "consent";
export type RecruitErrorCode = "required" | "length" | "invalid" | "pdfOnly" | "tooLarge";
export type RecruitErrors = Partial<Record<RecruitField, RecruitErrorCode>>;

export type RecruitInput = {
  name: string;
  email: string;
  phone: string;
  position: string;
  canton: string;
  message: string;
  consent: boolean;
  cv: { name: string; size: number } | null;
};

/** Valida lo que se puede validar sin leer el archivo (la firma %PDF la revisa el servidor). */
export function validateRecruitment(input: RecruitInput): RecruitErrors {
  const errors: RecruitErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const position = input.position.trim();

  if (!name) errors.name = "required";
  else if (name.length < RECRUIT_LIMITS.nameMin || name.length > RECRUIT_LIMITS.nameMax) errors.name = "length";

  if (!email) errors.email = "required";
  else if (email.length > RECRUIT_LIMITS.emailMax || !EMAIL_PATTERN.test(email)) errors.email = "invalid";

  if (!phone) errors.phone = "required";
  else if (phone.length > RECRUIT_LIMITS.phoneMax || !PHONE_PATTERN.test(phone)) errors.phone = "invalid";

  if (!position) errors.position = "required";
  else if (position.length > RECRUIT_LIMITS.positionMax) errors.position = "length";

  if (input.canton.trim().length > RECRUIT_LIMITS.cantonMax) errors.canton = "length";
  if (input.message.trim().length > RECRUIT_LIMITS.messageMax) errors.message = "length";

  if (!input.cv) errors.cv = "required";
  else if (!input.cv.name.toLowerCase().endsWith(".pdf")) errors.cv = "pdfOnly";
  else if (input.cv.size <= 0) errors.cv = "required";
  else if (input.cv.size > RECRUIT_LIMITS.cvMaxBytes) errors.cv = "tooLarge";

  if (!input.consent) errors.consent = "required";

  return errors;
}
