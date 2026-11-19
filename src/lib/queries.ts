import { queryOptions } from "@tanstack/react-query";
import { listProducts } from "./store.functions";

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
  staleTime: 5 * 60_000,
});
