import { describe, expect, it } from "vitest";
import { installmentValue, safeRedirect } from "@/lib/format";
import { checkoutSchema } from "@/lib/checkout-schema";

const validOrder = {
  customer: { name: "Maria Silva", phone: "(21) 97323-1992" },
  address: { cep: "20040-020", street: "Rua A", number: "10", neighborhood: "Centro", city: "Rio de Janeiro", state: "rj" },
  items: [{ productId: "4k", quantity: 1 }],
};

describe("store rules", () => {
  it("splits the price in 10 interest-free installments", () => {
    expect(installmentValue(299.9)).toBe(29.99);
    expect(installmentValue(199.9)).toBe(19.99);
  });

  it("blocks redirects to other websites after login", () => {
    expect(safeRedirect("https://evil.com")).toBe("/conta");
    expect(safeRedirect("//evil.com")).toBe("/conta");
    expect(safeRedirect("/checkout")).toBe("/checkout");
  });

  it("limits each product to 10 units per order", () => {
    expect(checkoutSchema.safeParse({ ...validOrder, items: [{ productId: "4k", quantity: 11 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse(validOrder).success).toBe(true);
  });

  it("never accepts a price from the browser", () => {
    const parsed = checkoutSchema.parse({ ...validOrder, items: [{ productId: "4k", quantity: 1, price: 0.01 }] });
    expect(parsed.items[0]).not.toHaveProperty("price");
  });
});
