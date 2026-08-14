// Thin mail-sending helper used by the API routes.
//
// No email provider credentials exist yet for this project. Until
// RESEND_API_KEY (and a verified sending domain) is configured in the
// environment, submissions are logged server-side instead of lost, and the
// forms still respond with success so the site is fully testable end to end.
//
// To go live: create a Resend account (or swap this for Nodemailer/SMTP),
// verify a sending domain for grupointeca.com, and set RESEND_API_KEY +
// RESEND_FROM in the environment.

type Attachment = {
  filename: string;
  content: string; // base64
};

type SendMailArgs = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
};

export async function sendMail({ to, subject, html, replyTo, attachments }: SendMailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Mercasa <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("[mailer] RESEND_API_KEY no configurado. Registrando envío localmente:", {
      to,
      subject,
      replyTo,
      attachments: attachments?.map((a) => a.filename),
    });
    return { delivered: false, reason: "no-provider-configured" as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
      attachments,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[mailer] Resend error:", res.status, body);
    return { delivered: false, reason: "provider-error" as const };
  }

  return { delivered: true as const };
}
