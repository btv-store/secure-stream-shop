import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCep, formatPhone } from "@/lib/format";
import { lookupCep, type ProfileForm } from "@/lib/profile";

export function ProfileFields({ value, onChange }: { value: ProfileForm; onChange: (v: ProfileForm) => void }) {
  const set = (k: keyof ProfileForm, v: string) => onChange({ ...value, [k]: v });

  async function onCep(raw: string) {
    const cep = formatCep(raw);
    const next = { ...value, cep };
    onChange(next);
    if (cep.replace(/\D/g, "").length === 8) {
      const found = await lookupCep(cep);
      if (found) onChange({ ...next, ...Object.fromEntries(Object.entries(found).filter(([, v]) => v)) });
    }
  }

  const field = (id: keyof ProfileForm, label: string, props: React.ComponentProps<typeof Input> = {}, className = "") => (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value[id]} onChange={(e) => set(id, e.target.value)} {...props} />
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      {field("full_name", "Nome completo", { autoComplete: "name", required: true, maxLength: 120 }, "sm:col-span-6")}
      <div className="space-y-2 sm:col-span-3">
        <Label htmlFor="phone">Telefone / WhatsApp</Label>
        <Input id="phone" inputMode="tel" autoComplete="tel" required value={value.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} placeholder="(21) 99999-9999" />
      </div>
      <div className="space-y-2 sm:col-span-3">
        <Label htmlFor="cep">CEP</Label>
        <Input id="cep" inputMode="numeric" autoComplete="postal-code" required value={value.cep} onChange={(e) => onCep(e.target.value)} placeholder="00000-000" />
      </div>
      {field("street", "Rua", { autoComplete: "address-line1", required: true, maxLength: 160 }, "sm:col-span-4")}
      {field("number", "Número", { required: true, maxLength: 20 }, "sm:col-span-2")}
      {field("complement", "Complemento", { autoComplete: "address-line2", maxLength: 80 }, "sm:col-span-6")}
      {field("neighborhood", "Bairro", { required: true, maxLength: 80 }, "sm:col-span-3")}
      {field("city", "Cidade", { autoComplete: "address-level2", required: true, maxLength: 80 }, "sm:col-span-2")}
      {field("state", "UF", { autoComplete: "address-level1", required: true, maxLength: 2 }, "sm:col-span-1")}
    </div>
  );
}
