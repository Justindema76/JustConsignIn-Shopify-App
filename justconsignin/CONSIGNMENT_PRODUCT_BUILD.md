# Consignment Manager product build

## Completed in this UI/UX pass

- Replaced the fixed 480px Jill-only layout with a responsive embedded-app layout.
- Added reusable navigation for Dashboard, Consignors, Items, Sales, and Payouts.
- Added a live dashboard computed from existing Shopify metaobject data.
- Added searchable, filterable item inventory with responsive desktop and mobile layouts.
- Added a sales ledger view based on the existing sold-item and Shopify order fields.
- Added consignor balance, sales, and active-inventory summaries.
- Added payout-due grouping and a complete create-payout review interface.
- Generalized product categories beyond childrenswear.
- Removed the hard-coded Jill & the Beanstalk product vendor. New products use the merchant's Shopify store name.
- Preserved consignor intake, batch item creation, photos, item editing, and Shopify product creation.

## Payout data layer still required

The payout review interface intentionally leaves **Record payout** disabled until app-owned payout definitions are installed and wired:

- Payout
- Payout line
- Commission-rate snapshot
- Payment status, date, method, reference, and notes
- Refund and return adjustments

## POS extension scaffold

Shopify requires POS extensions to be generated through Shopify CLI. From this app directory on the development Mac, run:

```bash
shopify app generate extension --name="Consignment sale" --template="pos_smart_grid"
```

The extension will use:

- `pos.home.tile.render` for the Consignment Sale tile
- `pos.home.modal.render` for ticket-number entry, validation, item confirmation, and adding the exact product to the cart

The consignment item must only be marked Sold after Shopify confirms successful payment.

## Validation completed

- ESLint
- React Router production build
- TypeScript typecheck

No Shopify store deployment or store data mutation was performed during this build.
