import assert from "node:assert/strict";
import { sendEmail, type EmailFetch } from "../lib/email-service";

const message = {
  to: "student@example.com",
  subject: "Kameng Library: Seat attendance check",
  text: "Please scan your Seat QR within 15 minutes."
};

const allProviders = {
  EMAIL_FROM: "Kameng Library <alerts@example.com>",
  RESEND_API_KEY: "resend-key",
  BREVO_API_KEY: "brevo-key",
  MAILJET_API_KEY: "mailjet-key",
  MAILJET_SECRET_KEY: "mailjet-secret"
};

function response(status: number) {
  return new Response("{}", { status, headers: { "Content-Type": "application/json" } });
}

async function main() {
  const fallbackCalls: Array<{ url: string; init: RequestInit }> = [];
  const fallbackFetch: EmailFetch = async (url, init) => {
    fallbackCalls.push({ url, init });
    return url.includes("resend.com") ? response(429) : response(201);
  };
  const fallbackDelivery = await sendEmail(message, { env: allProviders, fetchImpl: fallbackFetch });
  assert.equal(fallbackDelivery.delivered, true);
  assert.equal(fallbackDelivery.provider, "brevo");
  assert.deepEqual(fallbackCalls.map((call) => call.url), ["https://api.resend.com/emails", "https://api.brevo.com/v3/smtp/email"]);
  assert.equal(new Headers(fallbackCalls[1].init.headers).get("api-key"), "brevo-key");

  const mailjetCalls: Array<{ url: string; init: RequestInit }> = [];
  const mailjetDelivery = await sendEmail(message, {
    env: {
      EMAIL_FROM: allProviders.EMAIL_FROM,
      MAILJET_API_KEY: allProviders.MAILJET_API_KEY,
      MAILJET_SECRET_KEY: allProviders.MAILJET_SECRET_KEY
    },
    fetchImpl: async (url, init) => {
      mailjetCalls.push({ url, init });
      return response(200);
    }
  });
  assert.equal(mailjetDelivery.delivered, true);
  assert.equal(mailjetDelivery.provider, "mailjet");
  assert.equal(mailjetCalls[0].url, "https://api.mailjet.com/v3.1/send");
  assert.equal(new Headers(mailjetCalls[0].init.headers).get("authorization"), `Basic ${Buffer.from("mailjet-key:mailjet-secret").toString("base64")}`);
  const mailjetPayload = JSON.parse(String(mailjetCalls[0].init.body));
  assert.equal(mailjetPayload.Messages[0].From.Email, "alerts@example.com");
  assert.equal(mailjetPayload.Messages[0].To[0].Email, message.to);

  let uncertainCalls = 0;
  const uncertainDelivery = await sendEmail(message, {
    env: allProviders,
    fetchImpl: async () => {
      uncertainCalls += 1;
      return response(503);
    }
  });
  assert.equal(uncertainDelivery.delivered, false);
  assert.equal(uncertainCalls, 1);
  assert.match(uncertainDelivery.reason ?? "", /no fallback/i);

  const disabledDelivery = await sendEmail(message, {
    env: {},
    fetchImpl: async () => {
      throw new Error("A disabled provider must never be called.");
    }
  });
  assert.equal(disabledDelivery.attempted, false);
  assert.equal(disabledDelivery.delivered, false);

  console.log("Email fallback verification passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
