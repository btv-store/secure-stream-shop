export const WHATSAPP_NUMBER = "5521973231992";
export const WHATSAPP_DISPLAY = "(21) 97323-1992";

export function whatsappLink(text = "Olá! Quero comprar o BTV Stick."): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
