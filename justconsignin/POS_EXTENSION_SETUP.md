# Consignment Sale POS extension

The POS tile is in `extensions/consignment-sale`.

## What it does

1. A cashier opens **Consignment sale** from the Shopify POS smart grid.
2. The cashier types the ticket number or scans it with connected scanner hardware.
3. The app loads the matching `consignment_item` metaobject from Shopify.
4. The app blocks the sale unless the item and its linked Shopify product are available.
5. The cashier confirms the physical ticket number.
6. The extension adds the exact Shopify variant to the POS cart with quantity `1`.
7. The existing paid-order webhook records the sale after checkout succeeds.

The POS extension does not mark an item sold when it is merely added to the cart. This avoids false sales when a cart is abandoned or payment fails.

## Run locally

```shell
cd ~/Desktop/jatb-consignment
npm install
shopify app dev
```

Keep that terminal running while testing. In Shopify POS, open the development preview and add the **Consignment sale** tile to the smart grid.

## Before production

- Confirm every sellable consignment item links to a Shopify product.
- Confirm the product variant SKU exactly matches the ticket number.
- Confirm each item has inventory `1` at the POS location.
- Test one complete paid POS checkout and confirm the paid-order webhook updates the item to `Sold`.
- Run `shopify app deploy` only when the development-store test passes.
