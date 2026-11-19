import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/site/AuthCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — BTV Stick" },
      { name: "description", content: "Defina uma nova senha para sua conta BTV Stick." },
      { property: "og:title", content: "Criar nova senha — BTV Stick" },
      { property: "og:description", content: "Recupere o acesso à sua conta BTV Stick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (isRecovery && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
      setChecked(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) { toast.error("Use letras e números na senha."); return; }
    if (password !== confirm) { toast.error("As senhas não conferem."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error("Não foi possível trocar a senha. Peça um novo link."); return; }
    toast.success("Senha alterada com sucesso!");
    navigate({ to: "/conta", replace: true });
  }

  if (checked && !ready) {
    return (
      <AuthCard title="Link inválido" subtitle="Esse link expirou ou já foi usado. Peça um novo na tela de recuperação.">
        <Button variant="hero" size="xl" className="w-full" onClick={() => navigate({ to: "/auth", search: { mode: "forgot" } })}>
          Pedir novo link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Criar nova senha" subtitle="Escolha uma senha forte que você não usa em outros sites.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-confirm">Confirmar nova senha</Label>
          <Input id="new-confirm" type="password" autoComplete="new-password" required maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy || !ready}>
          {busy ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthCard>
  );
}
