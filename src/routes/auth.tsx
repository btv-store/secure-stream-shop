import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/site/AuthCard";
import { GoogleButton } from "@/components/site/GoogleButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { safeRedirect } from "@/lib/format";

type Mode = "login" | "signup" | "forgot";
type AuthSearch = { redirect?: string | undefined; mode?: Mode | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    mode: search["mode"] === "signup" || search["mode"] === "forgot" ? search["mode"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — BTV Stick" },
      { name: "description", content: "Entre na sua conta BTV Stick com e-mail ou Google, crie sua conta ou recupere sua senha." },
      { property: "og:title", content: "Entrar — BTV Stick" },
      { property: "og:description", content: "Acesse sua conta para acompanhar seus pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const MIN_PASSWORD = 8;

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const mode: Mode = search.mode ?? "login";
  const redirectTo = safeRedirect(search.redirect);

  useEffect(() => {
    if (loading || !user) return;
    const stored = sessionStorage.getItem("btv-post-login");
    sessionStorage.removeItem("btv-post-login");
    navigate({ to: safeRedirect(stored ?? redirectTo), replace: true });
  }, [user, loading, navigate, redirectTo]);

  const setMode = (m: Mode) => navigate({ to: "/auth", search: { redirect: search.redirect, mode: m === "login" ? undefined : m }, replace: true });

  if (mode === "forgot") return <ForgotForm onBack={() => setMode("login")} />;

  return (
    <AuthCard
      title={mode === "login" ? "Entrar" : "Criar conta"}
      subtitle={mode === "login" ? "Acesse sua conta para finalizar pedidos e acompanhar entregas." : "Leva menos de 1 minuto. Seus dados ficam protegidos."}
    >
      <div className="mb-6 grid grid-cols-2 rounded-full border border-border bg-surface p-1 text-sm">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 font-semibold transition-colors ${mode === m ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {m === "login" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <GoogleButton redirect={redirectTo} />
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> ou com e-mail <span className="h-px flex-1 bg-border" />
      </div>

      {mode === "login" ? <LoginForm onForgot={() => setMode("forgot")} /> : <SignupForm />}
    </AuthCard>
  );
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(
        /confirm/i.test(error.message)
          ? "Confirme seu e-mail pelo link que enviamos antes de entrar."
          : "E-mail ou senha incorretos.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <button type="button" onClick={onForgot} className="text-xs text-primary hover:underline">
            Esqueci minha senha
          </button>
        </div>
        <Input id="password" type="password" autoComplete="current-password" required maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
        {busy ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) { toast.error("Informe seu nome completo."); return; }
    if (password.length < MIN_PASSWORD) { toast.error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`); return; }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) { toast.error("Use letras e números na senha."); return; }
    if (password !== confirm) { toast.error("As senhas não conferem."); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: name.trim().slice(0, 120) } },
    });
    setBusy(false);
    if (error) {
      toast.error(/weak|pwned|leaked/i.test(error.message) ? "Essa senha é fraca ou já vazou na internet. Escolha outra." : "Não foi possível criar a conta. Confira os dados.");
      return;
    }
    if (!data.session) setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-primary/40 bg-accent/40 p-5 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <p className="mt-3 font-display text-lg font-semibold">Confira seu e-mail</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong className="text-foreground">{sentTo}</strong>. Clique nele para ativar sua conta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" autoComplete="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">E-mail</Label>
        <Input id="su-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Senha</Label>
        <Input id="su-password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="text-xs text-muted-foreground">Mínimo de {MIN_PASSWORD} caracteres, com letras e números.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-confirm">Confirmar senha</Label>
        <Input id="su-confirm" type="password" autoComplete="new-password" required maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
        {busy ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    // Same message whether or not the e-mail exists, so nobody can probe which accounts exist.
    setSent(true);
  }

  return (
    <AuthCard title="Recuperar conta" subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.">
      {sent ? (
        <div className="rounded-2xl border border-primary/40 bg-accent/40 p-5 text-center">
          <MailCheck className="mx-auto size-10 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Se houver uma conta com esse e-mail, você receberá o link em instantes. Confira também a caixa de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fg-email">E-mail</Label>
            <Input id="fg-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
            {busy ? "Enviando..." : "Enviar link"}
          </Button>
        </form>
      )}
      <button type="button" onClick={onBack} className="mt-5 w-full text-center text-sm text-primary hover:underline">
        Voltar para o login
      </button>
    </AuthCard>
  );
}
