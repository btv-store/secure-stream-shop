import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileFields } from "@/components/site/ProfileFields";
import { WhatsAppIcon } from "@/components/site/icons";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { productsQuery } from "@/lib/queries";
import { emptyProfile, profileQuery, saveProfile, type ProfileForm } from "@/lib/profile";
import { placeOrder } from "@/lib/store.functions";
import { checkoutSchema } from "@/lib/checkout-schema";
import { brl, installmentValue } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido — BTV Stick" },
      { name: "description", content: "Confira seu pedido BTV Stick e informe o endereço de entrega." },
      { property: "og:title", content: "Finalizar pedido — BTV Stick" },
      { property: "og:description", content: "Frete grátis para todo o Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

type Done = { code: string; total: number; items: { name: string; quantity: number; lineTotal: number }[] };

function Checkout() {
  const { user } = useAuth();
  const { items, clear } = useCart();
  const queryClient = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: saved } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const submitOrder = useServerFn(placeOrder);

  // Fill only the fields the customer hasn't typed yet.
  useEffect(() => {
    const metaName = typeof user?.user_metadata?.["full_name"] === "string" ? (user.user_metadata["full_name"] as string) : "";
    setForm((f) => {
      const next = { ...f };
      for (const k of Object.keys(next) as (keyof ProfileForm)[]) if (!next[k]) next[k] = saved?.[k] ?? "";
      if (!next.full_name) next.full_name = metaName;
      return next;
    });
  }, [saved, user]);

  const lines = items.map((i) => ({ ...i, product: products.find((p) => p.id === i.productId) })).filter((l) => l.product);
  const total = lines.reduce((s, l) => s + l.product!.price * l.quantity, 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      customer: { name: form.full_name, phone: form.phone },
      address: { cep: form.cep, street: form.street, number: form.number, complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state },
      items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    };
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira os dados."); return; }
    setBusy(true);
    try {
      if (remember && user) {
        await saveProfile(user.id, form).catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      }
      const result = await submitOrder({ data: payload });
      setDone(result);
      clear();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar o pedido.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const msg = `Olá! Acabei de fazer o pedido #${done.code} no site:\n${done.items.map((i) => `${i.quantity}x ${i.name}`).join("\n")}\nTotal: ${brl(done.total)}\nQuero combinar o pagamento.`;
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Pedido recebido!</h1>
        <p className="mt-2 text-muted-foreground">
          Número do pedido: <strong className="font-display text-foreground">#{done.code}</strong>
        </p>
        <p className="mt-1 text-muted-foreground">Total: {brl(done.total)} — frete grátis.</p>
        <p className="mt-6 text-sm text-muted-foreground">Agora é só chamar a gente no WhatsApp para combinar o pagamento e o envio.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button asChild variant="whatsapp" size="xl">
            <a href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" /> Combinar pagamento no WhatsApp
            </a>
          </Button>
          <Button asChild variant="glass" size="xl">
            <Link to="/conta">Ver meus pedidos</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <ShoppingCart className="mx-auto size-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">Seu carrinho está vazio</h1>
        <Button asChild variant="hero" size="xl" className="mt-6">
          <Link to="/" hash="produtos">Ver modelos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-4xl font-bold">Finalizar pedido</h1>
      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Dados de entrega</h2>
          <p className="mt-1 text-sm text-muted-foreground">Confirmação enviada para {user?.email}</p>
          <div className="mt-6">
            <ProfileFields value={form} onChange={setForm} />
          </div>
          <label className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} /> Salvar esses dados na minha conta
          </label>
        </section>

        <aside className="h-fit rounded-3xl border border-primary/40 bg-gradient-featured p-6 shadow-glow lg:sticky lg:top-24">
          <h2 className="text-xl font-bold">Resumo</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span>
                  {l.quantity}x {l.product!.name}
                </span>
                <span className="font-semibold">{brl(l.product!.price * l.quantity)}</span>
              </li>
            ))}
            <li className="flex justify-between text-muted-foreground">
              <span>Frete</span>
              <span className="text-gold">Grátis</span>
            </li>
          </ul>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-end justify-between">
              <span className="font-display">Total</span>
              <span className="font-display text-3xl font-bold">{brl(total)}</span>
            </div>
            <p className="mt-1 text-right text-xs text-muted-foreground">ou 10x de {brl(installmentValue(total))} sem juros</p>
          </div>
          <Button type="submit" variant="hero" size="xl" className="mt-6 w-full" disabled={busy}>
            {busy ? "Enviando pedido..." : "Confirmar pedido"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">O pagamento é combinado pelo WhatsApp após o pedido.</p>
        </aside>
      </form>
    </div>
  );
}
