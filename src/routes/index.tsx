import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck, Check, CreditCard, Headphones, ShieldCheck, ShoppingCart, Truck, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/icons";
import { productsQuery } from "@/lib/queries";
import { useCart } from "@/lib/cart";
import { brl, installmentValue } from "@/lib/format";
import { whatsappLink, WHATSAPP_DISPLAY } from "@/lib/whatsapp";
import poster from "@/assets/btv-stick-poster.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTV Stick — Transforme sua TV comum em Smart TV" },
      { name: "description", content: "Conecte o BTV Stick no HDMI e assista filmes, séries, esportes e apps. Frete grátis e até 10x sem juros." },
      { property: "og:title", content: "BTV Stick — Sua TV comum vira Smart TV" },
      { property: "og:description", content: "Modelos Lite, 4K e 4K Max com frete grátis, 1 ano de garantia e até 10x sem juros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Index,
});

const highlights = [
  { title: "4K", text: "Imagem ultra nítida" },
  { title: "Plug & Play", text: "Instala em 1 minuto" },
  { title: "1 ano", text: "De garantia" },
];

const perks = [
  { icon: Truck, text: "Frete grátis para todo o Brasil" },
  { icon: CreditCard, text: "Até 10x sem juros no cartão" },
  { icon: ShieldCheck, text: "Compra segura e dados protegidos" },
  { icon: Headphones, text: "Suporte pelo WhatsApp" },
];

function Index() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { add } = useCart();
  const featured = products.find((p) => p.featured) ?? products[0];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-12 md:grid-cols-2 md:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
              <Truck className="size-3.5" /> Frete grátis para todo o Brasil
            </span>
            <h1 className="mt-5 text-5xl font-bold leading-[1.05] md:text-6xl">
              Sua TV comum vira <span className="text-gradient-primary">Smart TV</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Conecte na entrada HDMI e assista filmes, séries, esportes e apps em segundos.
            </p>

            {featured && (
              <div className="mt-7 inline-flex items-center gap-4 rounded-2xl border border-primary/40 bg-card/70 px-5 py-4 shadow-glow">
                <div className="grid size-11 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leve o seu parcelado</p>
                  <p className="font-display text-2xl font-bold">
                    10x de <span className="text-primary">{brl(installmentValue(featured.price))}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">sem juros no cartão de crédito</p>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <a href="#produtos">Ver modelos</a>
              </Button>
              <Button asChild variant="glass" size="xl">
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="size-5 text-whatsapp" /> Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <div className="animate-float">
            <img
              src={poster.url}
              alt="BTV Stick com controle remoto: transforme sua TV em Smart TV"
              width={1254}
              height={1254}
              className="w-full rounded-3xl border border-primary/30 shadow-glow"
            />
          </div>
        </div>
      </section>

      <section id="beneficios" className="mx-auto max-w-6xl scroll-mt-20 px-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((h) => (
            <div key={h.title} className="rounded-3xl border border-border bg-card p-7 text-center">
              <p className="font-display text-3xl font-bold text-primary">{h.title}</p>
              <p className="mt-1 text-muted-foreground">{h.text}</p>
            </div>
          ))}
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-4 text-sm text-muted-foreground">
              <Icon className="size-5 shrink-0 text-primary" /> {text}
            </li>
          ))}
        </ul>
      </section>

      <section id="produtos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <div className="text-center">
          <h2 className="text-4xl font-bold md:text-5xl">Escolha seu BTV Stick</h2>
          <p className="mt-3 text-muted-foreground">
            Todos com frete grátis, 1 ano de garantia e parcelamento em até 10x sem juros.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {products.map((p) => (
            <article
              key={p.id}
              className={`relative flex flex-col rounded-3xl border p-7 ${
                p.featured ? "border-primary/60 bg-gradient-featured shadow-glow md:-translate-y-3" : "border-border bg-card"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                  MAIS VENDIDO
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className={`grid size-12 place-items-center rounded-full ${p.featured ? "bg-gradient-primary text-primary-foreground" : "bg-accent text-primary"}`}>
                  <Tv className="size-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="text-xs tracking-[0.2em] text-muted-foreground">{p.tag}</p>
                </div>
              </div>
              <p className="mt-7 font-display text-4xl font-bold">{brl(p.price)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                ou até 10x de <strong className="text-foreground">{brl(installmentValue(p.price))}</strong> sem juros
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="size-4 rounded-full bg-accent p-0.5 text-primary" /> {f}
                  </li>
                ))}
                <li className="flex items-center gap-3 text-gold">
                  <BadgeCheck className="size-4" /> Frete grátis
                </li>
              </ul>
              <Button variant={p.featured ? "hero" : "glass"} size="xl" className="mt-8 w-full" onClick={() => add(p.id)}>
                <ShoppingCart /> Adicionar ao carrinho
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-primary/30 bg-gradient-featured p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold">Ficou com alguma dúvida?</h2>
            <p className="mt-2 text-muted-foreground">Fale com a gente no WhatsApp e escolha o modelo ideal para sua TV.</p>
          </div>
          <Button asChild variant="whatsapp" size="xl">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="size-5" /> {WHATSAPP_DISPLAY}
            </a>
          </Button>
        </div>
      </section>
    </>
  );
}
