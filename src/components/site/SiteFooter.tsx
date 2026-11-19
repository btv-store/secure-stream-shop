import { ShieldCheck } from "lucide-react";
import { whatsappLink } from "@/lib/whatsapp";
import { Logo } from "./Logo";
import { WhatsAppIcon } from "./icons";

export function SiteFooter() {
  return (
    <>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo small />
          <p className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Pedidos protegidos e dados guardados com segurança
          </p>
          <p>© {new Date().getFullYear()} BTV Stick</p>
        </div>
      </footer>
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-soft transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="size-7" />
      </a>
    </>
  );
}
