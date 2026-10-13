# Eastco Hire Manager — clickable demo (Phase 0)

The preview of the business system for Eastco Decor Hire, made so the owner can try it and give the go-ahead.

**Live demo:** https://rolandvtonder.github.io/Client-software-project-planning-demo/

Everything runs in the browser: the clients are made up, the 125 equipment items, codes and prices come from the September 2026 catalogues, and nothing is ever sent to anyone. Data is kept in the browser (localStorage), so each person trying it gets their own copy. **Reset demo** in the gold ribbon puts the original data back. Dates are relative to today, so the demo always looks current, and it starts fresh if it hasn't been opened for a few days.

## Try this (about 5 minutes)

The demo opens with a **guided tour** that walks through these steps; it can be restarted from **Tour** in the gold bar.

1. **Dashboard:** today's delivery and collection, plus what needs attention.
2. **New quote:** pick *Bloom & Bough Events* and set the event date to the *Van der Merwe wedding* date (10 days from now). Type `30 CHA10` and press Enter. Only 10 chairs are free, so press **borrow 20** to take them from Krugersdorp. Send the quote.
3. Open **Client’s view** to see the quote page the client gets on WhatsApp, and accept and sign it with a finger. Back on the order, press **Record deposit**. The booking is confirmed and the tax invoice is issued.
4. **View as → Sipho (Driver)** in the ribbon, on a phone or in a narrow window. Open *Nomsa's baby shower*, count with the client, sign with a finger, and the delivery note is done.
5. Open *Quarterly strategy day* (coming back today) and run the **collection check**: mark something damaged, then settle the deposit on the order page.
6. **Reports:** orders for the month, with a CSV download for Excel.

## What's assumed (to confirm with Eastco)

These are the open questions for Eastco:

- VAT registered at 15%.
- Prices are per hire, not per day.
- The deposit is 30% of the hire (minimum R500).
- Delivery is a flat R450.
- How stock is split between the branches.
- Replacement costs and cleaning fees.
- Store-room locations.

All the money rules are in **Settings** or `src/domain/`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # business-rule tests: availability, totals, deposits
npm run lint     # type-check
npm run build    # static site in dist/
```

## Where things are

| | |
|---|---|
| `src/domain/` | Business rules: availability (no double-booking, soft holds, linen turnaround, branch transfers), totals, VAT, deposit refunds. These carry over to the live build unchanged. |
| `src/data/` | Demo catalogue, seed data and the browser store (stands in for Supabase). |
| `src/pages/` | Screens. `driver/` is the phone flow; `docs/` holds the printable quote, invoice, picking list, and delivery and return notes. |
| `src/styles/index.css` | Design tokens from the Eastco Hire Manager design system. |

## Deploying the demo

Every push to `main` type-checks, runs the tests, builds and publishes to GitHub Pages ([workflow](.github/workflows/deploy.yml)). It's a static site with hash routing, so `dist/` also works on any other host. The page is marked `noindex`.
