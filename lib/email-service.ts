type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailDelivery = {
  attempted: boolean;
  delivered: boolean;
  reason?: string;
};

function configuredSender() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : undefined;
}

export async function sendEmail(message: EmailMessage): Promise<EmailDelivery> {
  const sender = configuredSender();
  if (!sender) {
    return { attempted: false, delivered: false, reason: "Email alerts are not configured." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sender.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "kameng-library-seat-management/1.0"
      },
      body: JSON.stringify({
        from: sender.from,
        to: [message.to],
        subject: message.subject,
        text: message.text
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 240);
      console.error("Kameng Library email delivery failed.", { status: response.status, details });
      return { attempted: true, delivered: false, reason: `Email provider returned ${response.status}.` };
    }

    return { attempted: true, delivered: true };
  } catch (error) {
    console.error("Kameng Library email delivery could not be completed.", error);
    return { attempted: true, delivered: false, reason: "The email provider could not be reached." };
  }
}
