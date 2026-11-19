import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProfileFields } from "@/components/site/ProfileFields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { emptyProfile, profileQuery, saveProfile, type ProfileForm } from "@/lib/profile";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — BTV Stick" },
      { name: "description", content: "Seus dados de entrega e o histórico dos seus pedidos BTV Stick." },
      { property: "og:title", content: "Minha conta — BTV Stick" },
      { property: "og:description", content: "Acompanhe seus pedidos BTV Stick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

const STATUS: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function Account() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: saved } = useQuery({ ...profileQuery(user?.id ?? ""), enabled: !!user });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, code, total, status, created_at, items")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (saved) setForm(saved);
  }, [saved]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await saveProfile(user.id, form);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Dados salvos!");
    } catch {
      toast.error("Não foi possível salvar. Confira os campos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Minha conta</h1>
          <p className="mt-1 text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="glass" onClick={signOut}>
          <LogOut /> Sair
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Dados de entrega</h2>
          <p className="mt-1 text-sm text-muted-foreground">Usamos esses dados para preencher seus próximos pedidos.</p>
          <div className="mt-6">
            <ProfileFields value={form} onChange={setForm} />
          </div>
          <Button type="submit" variant="hero" size="xl" className="mt-6" disabled={busy}>
            {busy ? "Salvando..." : "Salvar dados"}
          </Button>
        </form>

        <section className="h-fit rounded-3xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold">Meus pedidos</h2>
          {orders.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <Package className="size-8 text-primary" /> Você ainda não fez pedidos.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold">#{o.code}</span>
                    <span className="rounded-full bg-accent px-3 py-0.5 text-xs text-primary">{STATUS[o.status] ?? o.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {(o.items as { name: string; quantity: number }[]).map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </p>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                    <span className="font-semibold">{brl(Number(o.total))}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
