/** Número mágico para pruebas locales sin Evolution (solo ceros, mín. 9 dígitos). */
export function normalizeWhatsappDigits(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function isTestWhatsappBypass(phoneDigits: string): boolean {
  return /^0{9,}$/.test(phoneDigits);
}
