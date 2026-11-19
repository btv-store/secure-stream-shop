const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const MAX_INSTALLMENTS = 10;

export function brl(value: number): string {
  return brlFormatter.format(value).replace(/\u00a0/g, " ");
}

/** Value of each interest-free installment, rounded down to the cent. */
export function installmentValue(total: number, installments = MAX_INSTALLMENTS): number {
  return Math.floor(Math.round(total * 100) / installments) / 100;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Only allow same-origin relative paths as post-login destinations (prevents open redirects). */
export function safeRedirect(value: unknown, fallback = "/conta"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
