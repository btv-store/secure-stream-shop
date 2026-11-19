import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProfileForm = {
  full_name: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export const emptyProfile: ProfileForm = {
  full_name: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<ProfileForm> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, cep, street, number, complement, neighborhood, city, state")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const out = { ...emptyProfile };
      for (const k of Object.keys(out) as (keyof ProfileForm)[]) out[k] = data?.[k] ?? "";
      return out;
    },
  });

export async function saveProfile(userId: string, p: ProfileForm) {
  const clean = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.trim() || null]));
  const { error } = await supabase.from("profiles").upsert({ id: userId, ...clean, state: p.state.trim().toUpperCase().slice(0, 2) || null });
  if (error) throw error;
}

/** Looks up a Brazilian postal code (public ViaCEP API). */
export async function lookupCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const d = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (d.erro) return null;
    return { street: d.logradouro ?? "", neighborhood: d.bairro ?? "", city: d.localidade ?? "", state: d.uf ?? "" };
  } catch {
    return null;
  }
}
