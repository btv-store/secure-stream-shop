import { z } from "zod";

export const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(3, "Informe seu nome completo").max(120),
    phone: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().min(10, "Telefone inválido").max(13, "Telefone inválido")),
  }),
  address: z.object({
    cep: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().length(8, "CEP inválido")),
    street: z.string().trim().min(2, "Informe a rua").max(160),
    number: z.string().trim().min(1, "Informe o número").max(20),
    complement: z.string().trim().max(80).optional().default(""),
    neighborhood: z.string().trim().min(2, "Informe o bairro").max(80),
    city: z.string().trim().min(2, "Informe a cidade").max(80),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "UF inválida"),
  }),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(10) }))
    .min(1, "Seu carrinho está vazio")
    .max(10),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
