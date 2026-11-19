import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutSchema } from "./checkout-schema";

export type Product = {
  id: string;
  name: string;
  tag: string;
  price: number;
  features: string[];
  featured: boolean;
};

export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client
    .from("products")
    .select("id, name, tag, price, features, featured")
    .order("sort_order");
  if (error) {
    console.error("[products]", error);
    throw new Error("Não foi possível carregar os produtos.");
  }
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price) }));
});

const ERROR_MESSAGES: Record<string, string> = {
  invalid_name: "Informe seu nome completo.",
  invalid_email: "Seu e-mail parece inválido.",
  invalid_phone: "Confira o telefone informado.",
  invalid_cep: "Confira o CEP.",
  invalid_street: "Confira a rua.",
  invalid_number: "Confira o número.",
  invalid_complement: "O complemento está muito longo.",
  invalid_neighborhood: "Confira o bairro.",
  invalid_city: "Confira a cidade.",
  invalid_state: "Confira a UF.",
  invalid_items: "Seu carrinho está vazio.",
  invalid_quantity: "Quantidade inválida (máximo 10 por produto).",
  invalid_product: "Um dos produtos não está mais disponível.",
};

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : "";
    if (!email) throw new Error("Sua conta precisa de um e-mail para fazer pedidos.");

    // Prices are computed in the database from the products table; the browser only sends ids and quantities.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("place_order", {
      _user_id: context.userId,
      _customer: { ...data.customer, email },
      _address: data.address,
      _items: data.items,
    });
    if (error || !rows?.[0]) {
      const key = Object.keys(ERROR_MESSAGES).find((k) => error?.message?.includes(k));
      console.error("[orders] place_order failed", error);
      throw new Error(key ? ERROR_MESSAGES[key] : "Não foi possível registrar o pedido. Tente novamente.");
    }

    const row = rows[0];
    const items = (row.order_items as { name: string; quantity: number; lineTotal: number }[]).map((i) => ({
      name: i.name,
      quantity: i.quantity,
      lineTotal: Number(i.lineTotal),
    }));
    const a = data.address;
    const { sendOrderEmails } = await import("./gmail.server");
    const emails = await sendOrderEmails({
      code: row.order_code,
      total: Number(row.order_total),
      items,
      customerName: data.customer.name,
      customerEmail: email,
      customerPhone: data.customer.phone,
      addressLine: `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}, ${a.neighborhood}, ${a.city}/${a.state}, CEP ${a.cep}`,
    });

    return { code: row.order_code, total: Number(row.order_total), items, emailSent: emails.sent };
  });
