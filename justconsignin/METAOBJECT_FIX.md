# Metaobject automatic-install fix

## What was broken

1. `ensureMetaobjectsInstalled()` existed, but no install/auth/app loader called it.
2. `shopify.app.toml` did not request `read_metaobject_definitions` and `write_metaobject_definitions`.
3. The setup function called `db.shopSetup.upsert()`, but the Prisma schema has no `ShopSetup` model.
4. The old installer only defined six fields for `justconsignin_item`, while the app reads and writes many more fields.
5. The app also uses a `consignor` metaobject definition, but the installer never created it.

## What changed

- Added both definition scopes.
- The authenticated `/app` loader now runs the installer automatically.
- The installer creates `consignor` first, then `justconsignin_item`.
- Existing definitions are repaired by adding missing fields.
- Removed the invalid `db.shopSetup` call.

## Deploy

Run:

```bash
shopify app deploy
```

Then open/install the newly deployed app version. Existing stores must approve the two new definition scopes. Opening the app after approval runs the setup automatically.

For local development:

```bash
shopify app dev
```
