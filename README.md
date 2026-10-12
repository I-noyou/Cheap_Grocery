# Cheap Grocery

Cheap Grocery is a grocery discovery and shopping helper with a vanilla HTML/CSS/JavaScript frontend and a Node.js + MongoDB backend.

## Current backend status

This repository includes Phase 4: Product Catalog Architecture, Phase 5: Exact Product Variant System, and Phase 6: Store Inventory & Availability.

### Product catalog model

- Canonical records are stored in the MongoDB `products` collection.
- Each record uses a stable `productId` such as `prod-rice` or `prod-body-lotion`.
- Product IDs are deterministic and do not depend on array order.
- Legacy frontend catalog keys are preserved as `legacyCatalogKey` and the original catalog payload is stored in `legacyCatalog` for compatibility.
- Product names are normalized into a stable slug and a small alias set for search.

### Product endpoints

Base URL: `/api/v1`

- `GET /api/v1/products?page=1&limit=20`
- `GET /api/v1/products/:productId`
- `GET /api/v1/products/search?q=rice&limit=10`
- `GET /api/v1/products/:productId/variants?limit=20`
- `GET /api/v1/variants/:variantId`
- `GET /api/v1/variants/search?productId=prod-rice&brand=India%20Gate&variety=Basmati%20Rice&quantity=5000&unit=g`
- `GET /api/v1/stores/:storeId/inventory`
- `GET /api/v1/variants/:variantId/availability`

### Product import

Use the explicit developer script:

- `cd backend`
- `npm run seed:products`
- `npm run seed:products:dry-run`

The import reads the existing catalog from the frontend `script.js` file, normalizes it, and upserts products and variants into MongoDB without deleting existing records. It is not run automatically on server startup. The dry run validates and counts both product and variant records without connecting to MongoDB.

### Variant identity and normalization

- Variants are stored in the `productVariants` collection and never contain store prices or availability.
- `variantId` is deterministic from `productId`, normalized variety, normalized brand, canonical package quantity, and canonical package unit. It is not random or array-index based.
- Text identity matching trims and collapses whitespace and compares case-insensitively while preserving display labels.
- Mass is stored as grams and volume as millilitres; `1 kg` equals `1000 g`, but mass and volume never match. Package display labels remain unchanged.
- MongoDB enforces unique `variantId` and unique normalized product/variety/brand/package identity.
- The frontend keeps its existing catalog fallback and adds `variantId` as an optional field to newly selected catalog items. Existing saved list records remain valid.

### Notes

- The frontend still uses the hardcoded catalog in `script.js` as a compatibility fallback while the backend API is introduced.
- The backend catalog and variant APIs are read-only and do not create, delete, or mutate user cart or list data.

## Store inventory

Inventory is stored in MongoDB's `inventory` collection and links a stable store ObjectId string to a stable `variantId`. Each store/variant pair has one current record with `available`, `unavailable`, or `unknown` availability. Missing records are not treated as unavailable. Records with no verification timestamp, or older than 24 hours, are marked `isStale` in read responses without being changed automatically.

There is no public inventory-write endpoint. Trusted development imports use a JSON file and the explicit command:

```text
cd backend
npm run seed:inventory -- path/to/inventory.json --dry-run
npm run seed:inventory -- path/to/inventory.json
```

The import validates store and active variant references, availability, optional non-negative stock quantity, stock unit, source, and timestamps. It upserts on `storeId + variantId` and never deletes other records.

Inventory has no frontend write or status-display integration yet. The existing product selection and grocery-list flow remains unchanged; this avoids displaying inventory state without a user-selected store context. Inventory responses contain no prices.

The product catalog uses the frontend catalog keys as compatibility categories because the original catalog did not contain a separate category taxonomy.

## Project layout

- `script.js` - existing frontend selection logic and catalog data
- `CheapGrocery.html` - storefront shell
- `style.css` - app styling
- `backend/src` - Node.js + Express + MongoDB backend
- `backend/.env.example` - environment template

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Update `MONGODB_URI` if needed.
3. Start MongoDB locally.
4. Run `cd backend && npm install`.
5. Start the backend with `npm run dev`.
