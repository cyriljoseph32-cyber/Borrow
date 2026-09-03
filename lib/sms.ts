/**
 * OTP téléphone via Twilio Verify.
 *
 * Nécessite 3 variables d'env : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_VERIFY_SERVICE_SID (créer un "Verify Service" dans la console Twilio,
 * gratuit — pas de configuration d'expéditeur SMS séparée nécessaire).
 *
 * Pas de dépendance au SDK `twilio` : deux appels REST simples suffisent, et ça
 * évite d'alourdir le bundle serveur.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

function twilioConfigured() {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID);
}

function authHeader() {
  const token = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  return `Basic ${token}`;
}

export class SmsNotConfiguredError extends Error {
  constructor() {
    super("SMS verification is not configured yet.");
  }
}

/** Envoie un code à 6 chiffres par SMS via Twilio Verify. */
export async function sendOtp(phone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!twilioConfigured()) throw new SmsNotConfiguredError();

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: "sms" }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? "Could not send the SMS. Check the number." };
  }
  return { ok: true };
}

/** Vérifie le code saisi par l'utilisateur. */
export async function checkOtp(
  phone: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!twilioConfigured()) throw new SmsNotConfiguredError();

  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    }
  );

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: body?.message ?? "Could not check the code." };
  }
  if (body?.status !== "approved") {
    return { ok: false, error: "Wrong or expired code." };
  }
  return { ok: true };
}

export { twilioConfigured };
