// Server-only: sends order emails through the connected Gmail account.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

type OrderEmail = {
  code: string;
  total: number;
  items: { name: string; quantity: number; lineTotal: number }[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine: string;
};

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const header = (v: string) => {
  const clean = v.replace(/[\r\n]+/g, " ");
  return /^[\x00-\x7F]*$/.test(clean) ? clean : `=?UTF-8?B?${b64(clean)}?=`;
};
const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function raw(to: string, subject: string, body: string) {
  const msg = [
    `To: ${to.replace(/[\r\n,;<>]/g, "")}`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(body),
  ].join("\r\n");
  return b64(msg).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function gmailFetch(path: string, init: RequestInit, lovableKey: string, gmailKey: string) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmailKey,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail request failed [${res.status}]: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/** Best effort: never throws, so an email problem never blocks an order. */
export async function sendOrderEmails(order: OrderEmail): Promise<{ sent: boolean }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !gmailKey) {
    console.warn("[orders] Gmail is not connected; order emails skipped");
    return { sent: false };
  }
  try {
    const profile = await gmailFetch("/users/me/profile", { method: "GET" }, lovableKey, gmailKey);
    const storeEmail = String(profile["emailAddress"] ?? "");
    const lines = order.items.map((i) => `• ${i.quantity}x ${i.name} — ${money(i.lineTotal)}`).join("\n");

    const storeBody = `Novo pedido #${order.code}\n\n${lines}\n\nTotal: ${money(order.total)} (frete grátis)\n\nCliente: ${order.customerName}\nE-mail: ${order.customerEmail}\nTelefone: ${order.customerPhone}\nEndereço: ${order.addressLine}\n`;
    const customerBody = `Olá, ${order.customerName}!\n\nRecebemos seu pedido #${order.code} na BTV Stick.\n\n${lines}\n\nTotal: ${money(order.total)} — frete grátis para todo o Brasil.\nEntrega em: ${order.addressLine}\n\nPara combinar o pagamento, fale com a gente no WhatsApp: (21) 97323-1992.\n\nObrigado pela compra!\nEquipe BTV Stick`;

    const sends = [];
    if (storeEmail) {
      sends.push(
        gmailFetch("/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw: raw(storeEmail, `Novo pedido #${order.code} — ${money(order.total)}`, storeBody) }) }, lovableKey, gmailKey),
      );
    }
    sends.push(
      gmailFetch("/users/me/messages/send", { method: "POST", body: JSON.stringify({ raw: raw(order.customerEmail, `Recebemos seu pedido #${order.code}`, customerBody) }) }, lovableKey, gmailKey),
    );
    await Promise.all(sends);
    return { sent: true };
  } catch (error) {
    console.error("[orders] Failed to send order emails", error);
    return { sent: false };
  }
}
