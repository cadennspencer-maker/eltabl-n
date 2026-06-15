export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const RESEND_API_KEY = "re_GJWQTB7h_5vDxFQFoA1bxcEbBXt5jvCLW";
  const FROM_EMAIL     = "noreply@xn--eltabln-q0a.com";

  const data = req.body;
  const toEmail = data.contactValue;

  if (!toEmail || !toEmail.includes("@")) {
    return res.status(400).json({ error: "No valid email" });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        subject: `[El Tablón] Hemos recibido tu propuesta: ${data.title}`,
        html: `
          <div style="font-family:monospace;max-width:560px;margin:0 auto;padding:32px;color:#111110;">
            <div style="font-size:11px;letter-spacing:2px;color:#a8a8a4;margin-bottom:24px;">EL TABLÓN — CONFIRMACIÓN DE PROPUESTA</div>
            <div style="font-family:Georgia,serif;font-size:20px;font-style:italic;margin-bottom:16px;">Hemos recibido tu propuesta</div>
            <p style="font-size:13px;color:#6b6b68;line-height:1.7;margin-bottom:24px;">
              Gracias por proponer un evento en El Tablón. Hemos recibido tu solicitud y nuestro equipo la revisará en los próximos días.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;width:110px;">evento</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.title}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">fecha</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.date} · ${data.time}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">lugar</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.location}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">referencia</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;font-weight:bold;">${data.submissionRef}</td></tr>
            </table>
            <p style="font-size:12px;color:#6b6b68;line-height:1.7;margin-bottom:24px;">
              Si tienes alguna pregunta, puedes contactarnos en <a href="mailto:hola@eltablon.org" style="color:#111110;">hola@eltablon.org</a>.
            </p>
            <div style="border-top:1px solid #d8d6d0;padding-top:20px;font-size:11px;color:#a8a8a4;">
              El Tablón — Voluntariado accesible en Madrid
            </div>
          </div>
        `,
      }),
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (err) {
    console.error("Confirm email error:", err);
    return res.status(500).json({ error: err.message });
  }
}
