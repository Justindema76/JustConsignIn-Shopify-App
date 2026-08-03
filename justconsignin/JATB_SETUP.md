# JATB Consignment App

This embedded Shopify app uses the existing merchant-owned metaobjects:

- `consignor`
- `consignment_item`

The current version can load consignors/items and create, update, or delete
their metaobject entries. The original mobile-first interface is preserved.

## Run on the development store

From Terminal:

```bash
cd ~/Desktop/jatb-consignment
npm install
shopify app dev --store justindematteis.myshopify.com
```

Approve the requested `read_metaobjects` and `write_metaobjects` permissions
when Shopify opens the installation screen.

## Current scope

This version intentionally does not request product or file permissions.
Creating linked Shopify products and permanently uploading item photos will be
added only after those additional permissions are approved.

The existing Cloudflare Worker remains responsible for the paid-order webhook
and sold-item automation.
