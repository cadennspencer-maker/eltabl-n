export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const RESEND_API_KEY = "re_GJWQTB7h_5vDxFQFoA1bxcEbBXt5jvCLW";
  const NOTIFY_EMAIL  = "hola@eltablon.org";
  const FROM_EMAIL    = "noreply@xn--eltabln-q0a.com";

  const data = req.body;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: `[El Tablón] Nueva propuesta: ${data.title}`,
        html: `
          <div style="font-family:monospace;max-width:560px;margin:0 auto;padding:32px;color:#111110;">
            <div style="font-size:11px;letter-spacing:2px;color:#a8a8a4;margin-bottom:24px;">EL TABLÓN — NUEVA PROPUESTA</div>
            <div style="font-size:20px;font-family:Georgia,serif;font-style:italic;margin-bottom:24px;">${data.title}</div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;width:110px;">organización</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.organizer}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">categoría</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.category}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">fecha</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.date} · ${data.time}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">lugar</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.location}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">contacto</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.contactMethod}: ${data.contactValue}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #ebebea;color:#a8a8a4;">referencia</td><td style="padding:8px 0;border-bottom:1px solid #ebebea;">${data.submissionRef}</td></tr>
            </table>
            <div style="margin-top:20px;font-size:12px;color:#6b6b68;line-height:1.7;">${data.description}</div>
            <div style="margin-top:32px;padding-top:20px;border-top:1px solid #d8d6d0;font-size:11px;color:#a8a8a4;">
              Entra al panel de administración para aprobar o rechazar este evento.
            </div>
          </div>
        `,
      }),
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (err) {
    console.error("Resend error:", err);
    return res.status(500).json({ error: err.message });
  }
}
