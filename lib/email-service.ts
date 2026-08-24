type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailProvider = "resend" | "brevo" | "mailjet";

export type EmailDelivery = {
  attempted: boolean;
  delivered: boolean;
  provider?: EmailProvider;
  reason?: string;
};

export type EmailEnvironment = Record<string, string | undefined>;

export type EmailFetch = (input: string, init: RequestInit) => Promise<Response>;

type EmailProviderConfig = {
  provider: EmailProvider;
  apiKey: string;
  from: string;
  sender: {
    email: string;
    name: string;
  };
  secret?: string;
  apiBaseUrl?: string;
};

type ProviderAttempt = {
  provider: EmailProvider;
  outcome: "delivered" | "try-next" | "stop";
  reason?: string;
};

type SendEmailOptions = {
  env?: EmailEnvironment;
  fetchImpl?: EmailFetch;
};

const PROVIDER_LABELS: Record<EmailProvider, string> = {
  resend: "Resend",
  brevo: "Brevo",
  mailjet: "Mailjet"
};

// These status codes mean the provider rejected the request before it could be delivered.
const SAFE_FALLBACK_STATUSES = new Set([401, 402, 403, 429]);

function parseSender(from?: string) {
  const value = from?.trim();
  if (!value) return undefined;

  const bracketed = value.match(/^(.*?)\s*<([^<>\s@]+@[^<>\s@]+)>$/);
  if (bracketed) {
    return {
      email: bracketed[2],
      name: bracketed[1].trim().replace(/^"|"$/g, "") || "Kameng Library"
    };
  }

  if (/^[^<>\s@]+@[^<>\s@]+$/.test(value)) {
    return { email: value, name: "Kameng Library" };
  }

  return undefined;
}

function configuredProviders(env: EmailEnvironment): EmailProviderConfig[] {
  const from = env.EMAIL_FROM?.trim();
  const sender = parseSender(from);
  if (!from || !sender) return [];

  const providers: EmailProviderConfig[] = [];
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const brevoApiKey = env.BREVO_API_KEY?.trim();
  const mailjetApiKey = env.MAILJET_API_KEY?.trim();
  const mailjetSecret = env.MAILJET_SECRET_KEY?.trim();

  if (resendApiKey) providers.push({ provider: "resend", apiKey: resendApiKey, from, sender });
  if (brevoApiKey) providers.push({ provider: "brevo", apiKey: brevoApiKey, from, sender });
  if (mailjetApiKey && mailjetSecret) {
    providers.push({
      provider: "mailjet",
      apiKey: mailjetApiKey,
      secret: mailjetSecret,
      from,
      sender,
      apiBaseUrl: env.MAILJET_API_BASE_URL?.trim().replace(/\/+$/, "") || "https://api.mailjet.com"
    });
  }

  return providers;
}

export function configuredEmailProviders(env: EmailEnvironment = process.env): EmailProvider[] {
  return configuredProviders(env).map((provider) => provider.provider);
}

export function emailProviderLabel(provider: EmailProvider) {
  return PROVIDER_LABELS[provider];
}

function requestForProvider(config: EmailProviderConfig, message: EmailMessage): { url: string; init: RequestInit } {
  if (config.provider === "resend") {
    return {
      url: "https://api.resend.com/emails",
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          text: message.text
        }),
        signal: AbortSignal.timeout(8000)
      }
    };
  }

  if (config.provider === "brevo") {
    return {
      url: "https://api.brevo.com/v3/smtp/email",
      init: {
        method: "POST",
        headers: {
          "api-key": config.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: config.sender,
          to: [{ email: message.to }],
          subject: message.subject,
          textContent: message.text
        }),
        signal: AbortSignal.timeout(8000)
      }
    };
  }

  return {
    url: `${config.apiBaseUrl}/v3.1/send`,
    init: {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.secret}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: config.sender.email, Name: config.sender.name },
          To: [{ Email: message.to }],
          Subject: message.subject,
          TextPart: message.text
        }]
      }),
      signal: AbortSignal.timeout(8000)
    }
  };
}

async function sendWithProvider(config: EmailProviderConfig, message: EmailMessage, fetchImpl: EmailFetch): Promise<ProviderAttempt> {
  try {
    const request = requestForProvider(config, message);
    const response = await fetchImpl(request.url, request.init);
    if (response.ok) return { provider: config.provider, outcome: "delivered" };

    if (SAFE_FALLBACK_STATUSES.has(response.status)) {
      return {
        provider: config.provider,
        outcome: "try-next",
        reason: `${PROVIDER_LABELS[config.provider]} returned ${response.status} before accepting the email.`
      };
    }

    return {
      provider: config.provider,
      outcome: "stop",
      reason: `${PROVIDER_LABELS[config.provider]} returned ${response.status}; no fallback was attempted to avoid duplicate delivery.`
    };
  } catch (error) {
    console.error("Kameng Library email provider could not be reached.", {
      provider: config.provider,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return {
      provider: config.provider,
      outcome: "stop",
      reason: `${PROVIDER_LABELS[config.provider]} could not confirm the email request, so no fallback was attempted to avoid duplicates.`
    };
  }
}

export async function sendEmail(message: EmailMessage, options: SendEmailOptions = {}): Promise<EmailDelivery> {
  const providers = configuredProviders(options.env ?? process.env);
  if (!providers.length) {
    return { attempted: false, delivered: false, reason: "Email alerts are not configured." };
  }

  const fetchImpl: EmailFetch = options.fetchImpl ?? fetch;
  let lastAttempt: ProviderAttempt | undefined;

  for (const provider of providers) {
    const attempt = await sendWithProvider(provider, message, fetchImpl);
    lastAttempt = attempt;

    if (attempt.outcome === "delivered") {
      return { attempted: true, delivered: true, provider: attempt.provider };
    }

    if (attempt.outcome === "try-next") {
      console.warn("Kameng Library email provider rejected delivery before acceptance; trying the next configured provider.", {
        provider: attempt.provider
      });
      continue;
    }

    console.error("Kameng Library email delivery stopped.", { provider: attempt.provider });
    return { attempted: true, delivered: false, provider: attempt.provider, reason: attempt.reason };
  }

  return {
    attempted: true,
    delivered: false,
    provider: lastAttempt?.provider,
    reason: "Every configured email provider rejected the request before accepting it."
  };
}
