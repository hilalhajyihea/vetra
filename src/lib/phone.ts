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
