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
