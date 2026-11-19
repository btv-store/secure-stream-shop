import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2, Tv } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart, MAX_QTY } from "@/lib/cart";
import { productsQuery } from "@/lib/queries";
import { brl, installmentValue } from "@/lib/format";

export function CartSheet() {
  const { items, open, setOpen, setQuantity, remove } = useCart();
  const { data: products = [] } = useQuery(productsQuery);
  const navigate = useNavigate();

  const lines = items
    .map((i) => ({ ...i, product: products.find((p) => p.id === i.productId) }))
    .filter((l) => l.product);
  const total = lines.reduce((sum, l) => sum + l.product!.price * l.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col border-border bg-background sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Seu carrinho</SheetTitle>
          <SheetDescription>Frete grátis para todo o Brasil.</SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <ShoppingCart className="size-10 text-primary" />
            <p>Seu carrinho está vazio.</p>
          </div>
        ) : (
          <ul className="flex-1 space-y-3 overflow-y-auto px-4">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="grid size-11 place-items-center rounded-full bg-accent text-primary">
                  <Tv className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold">{l.product!.name}</p>
                  <p className="text-sm text-muted-foreground">{brl(l.product!.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="glass" size="icon" className="size-8" aria-label="Diminuir" onClick={() => setQuantity(l.productId, l.quantity - 1)}>
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                  <Button variant="glass" size="icon" className="size-8" aria-label="Aumentar" disabled={l.quantity >= MAX_QTY} onClick={() => setQuantity(l.productId, l.quantity + 1)}>
                    <Plus />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label="Remover" onClick={() => remove(l.productId)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Frete</span>
              <span className="text-gold">Grátis</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-display text-lg">Total</span>
              <div className="text-right">
                <p className="font-display text-2xl font-bold">{brl(total)}</p>
                <p className="text-xs text-muted-foreground">ou 10x de {brl(installmentValue(total))} sem juros</p>
              </div>
            </div>
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/checkout" });
              }}
            >
              Finalizar pedido
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
