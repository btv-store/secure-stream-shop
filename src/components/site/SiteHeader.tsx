import { Link } from "@tanstack/react-router";
import { ShoppingCart, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { whatsappLink } from "@/lib/whatsapp";
import { Logo } from "./Logo";
import { WhatsAppIcon } from "./icons";

export function SiteHeader() {
  const { count, setOpen } = useCart();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/" hash="beneficios" className="hidden px-3 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline">
            Benefícios
          </Link>
          <Link to="/" hash="produtos" className="hidden px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">
            Produtos
          </Link>
          <Button asChild variant="whatsapp" size="sm" className="hidden h-9 px-4 md:inline-flex">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-4" /> WhatsApp
            </a>
          </Button>
          {user ? (
            <Button asChild variant="glass" size="icon" aria-label="Minha conta">
              <Link to="/conta">
                <UserRound />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="glass" size="sm" className="h-9 px-4">
              <Link to="/auth" search={{}}>
                <UserRound /> Entrar
              </Link>
            </Button>
          )}
          <Button variant="glass" size="icon" className="relative" aria-label={`Abrir carrinho, ${count} itens`} onClick={() => setOpen(true)}>
            <ShoppingCart />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}
