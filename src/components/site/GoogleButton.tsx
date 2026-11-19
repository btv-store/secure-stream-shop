import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GoogleLogo } from "./icons";

export function GoogleButton({ redirect }: { redirect: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    sessionStorage.setItem("btv-post-login", redirect);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
    }
  }

  return (
    <Button type="button" variant="google" size="google" className="w-full" onClick={signIn} disabled={loading}>
      <GoogleLogo />
      Continuar com Google
    </Button>
  );
}
