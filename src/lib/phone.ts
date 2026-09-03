/** Store and compare phones as local 05xxxxxxxx. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9) return `0${digits}`;
  return digits;
}

export function isValidMobile(phone: string): boolean {
  return /^05\d{8}$/.test(phone);
}

/** Key used to match inbound Cloud API numbers to stored farm phones. */
export function inboundPhoneKey(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("1") && digits.length === 11) return digits;
  return normalizePhone(raw);
}

/** Recipient for Cloud API: Israel 972… or other E.164 digits. */
export function toCloudRecipient(phone: string): string | null {
  const il = toWhatsAppDigits(phone);
  if (il) return il;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

/** Digits for wa.me, e.g. 972501234567 */
export function toWhatsAppDigits(phone: string): string | null {
  const local = normalizePhone(phone);
  if (!isValidMobile(local)) return null;
  return `972${local.slice(1)}`;
}

export function whatsappChatHref(phone: string, text: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  const encoded = encodeURIComponent(text);
  return encoded
    ? `https://wa.me/${digits}?text=${encoded}`
    : `https://wa.me/${digits}`;
}
