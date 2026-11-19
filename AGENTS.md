<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Order totals are computed only by the `place_order` database function from the `products` table, called by the `placeOrder` server function with the service role; the browser sends product ids and quantities only. Why: customers must not be able to change prices.
- Checkout requires a signed-in account (`/_authenticated/checkout`) and the customer e-mail comes from the verified session. Why: prevents fake orders and e-mail spam to arbitrary addresses.
- Product data lives in the `products` table and is read through the `listProducts` server function; never hardcode prices in components. Why: one source of truth for display and charging.
- Order e-mails go through the Gmail connector in `src/lib/gmail.server.ts`, best effort and skipped when the connector key is missing. Why: an e-mail failure must never block an order.
- Secret keys (service role, connector keys, LOVABLE_API_KEY) are read only inside server handlers via `process.env`. Why: nothing secret may reach the browser bundle.
