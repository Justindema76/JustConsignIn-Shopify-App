# Just Consignin Shopify App

A complete consignment management application built for Shopify merchants.

Just Consignin helps retailers manage consignors, track consignment inventory, create Shopify products, record sales, calculate payouts, issue store credit, and maintain transaction history from one central application.

---

# Overview

Just Consignin is designed to replace spreadsheets, handwritten tags, and disconnected consignment tracking systems.

The application connects directly with Shopify and allows merchants to manage the full consignment process, including:

- Adding consignors
- Adding consignment items
- Creating Shopify products
- Tracking item availability
- Recording Shopify POS sales
- Recording manual sales
- Calculating consignor payouts
- Recording payments
- Managing store credit
- Importing and exporting data
- Reviewing transaction history

The app is designed to work inside Shopify Admin and can also support Shopify POS workflows.

The goal is to give consignment retailers a simple, mobile-friendly system that works with their existing Shopify store.

---

# Features

## Consignor Management

Create and manage consignor profiles directly inside the application.

Each consignor profile can include:

- Full name
- Email address
- Phone number
- Street address
- City
- Province or state
- Postal or ZIP code
- Commission percentage
- Store credit balance
- Internal notes
- Date created

From the consignor profile, merchants can:

- Edit consignor information
- View all items belonging to the consignor
- View available items
- View sold items
- View unpaid balances
- View completed payouts
- Record a payment
- Add or deduct store credit
- Import items for that consignor
- Review transaction history
- Delete the consignor when appropriate

---

## Item Management

Create and manage individual consignment items.

Each item can include:

- Item number
- Consignor
- Product title
- Item description
- Brand
- Category
- Product type
- Size
- Condition
- Original price
- Sale price
- Commission percentage
- Consignor payout amount
- Item image
- Shopify product ID
- Shopify variant ID
- Date added
- Date sold
- Item status
- Payment status
- Internal notes

Supported item statuses may include:

- Available
- Sold
- Unpaid
- Paid
- Archived

Item numbers can be created automatically and manually adjusted when required.

When an item has been sold, editing can be restricted so important sale information is not accidentally changed.

---

## Shopify Product Integration

Create a Shopify product directly from a consignment item.

The application can use the item information to create:

- Product title
- Product description
- Product image
- Price
- Product type
- Brand or vendor
- Tags
- Inventory quantity
- Shopify category
- Sales channel availability

By default, consignment items can be created with an inventory quantity of one.

Products can be made available to:

- Shopify POS
- Online Store
- Other enabled Shopify sales channels

The merchant can choose whether the item should be available online.

After a Shopify product has been created, the application stores the Shopify product and variant identifiers and changes the action from:

`Create Shopify Product`

to:

`Edit Shopify Product`

This prevents duplicate products from being created for the same consignment item.

---

## Shopify POS Integration

Just Consignin is designed to support Shopify POS sales.

When a consignment product is sold through Shopify POS, the application can:

- Detect the Shopify order
- Match the order line item to the consignment item
- Record the sale price
- Record the sale date
- Save the Shopify order number
- Change the item status to sold
- Change the payment status to unpaid
- Add the amount owed to the consignor

The normal item workflow is:

```text
Available
   ↓
Sold
   ↓
Unpaid
   ↓
Paid