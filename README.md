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

## Store prices (Phase 7)

Current prices are stored separately from inventory in the `prices` collection and are unique per `storeId` and exact `variantId`. Missing prices are omitted from responses; they are never represented as zero. Price observations are append-only in `priceHistory` and include their source and observation time.

Read endpoints:

- `GET /api/v1/stores/:storeId/prices?page=1&limit=20`
- `GET /api/v1/variants/:variantId/prices?limit=20`
- `GET /api/v1/stores/:storeId/variants/:variantId/price-history?page=1&limit=50`
- `GET /api/v1/variants/:variantId/price-comparison?page=1&limit=20&maxAgeDays=7`

The comparison endpoint reads only current prices for the requested exact variant. It excludes non-positive, invalid-currency, mismatched-package, and stale observations (the default maximum age is seven days; `maxAgeDays` accepts 1–365). Results are sorted by amount and then store name and ID. Savings are the difference from the highest eligible price in the selected comparison currency and are not guaranteed savings. If multiple currencies are present, the currency with the most eligible records is selected (ties use currency code order); other currencies are excluded and listed in the response.

Inventory is queried separately and is returned as `available`, `unavailable`, or `unknown`; a missing inventory record remains unknown and a price never implies stock. Supplying `latitude` and `longitude` together enables the existing GeoJSON/2dsphere nearby-store filter. `radiusKm` is optional and defaults to 5 km when coordinates are supplied, with a 0.5–50 km bound. Without coordinates, no distance is calculated or inferred.

Users now have a server-side `role` field (`user` or `admin`). Public registration always creates a `user`; administrator records must be provisioned through a controlled server-side/database process and are never created from request data. The reusable admin middleware reloads the user through the existing session and MongoDB lookup, returning `401` for unauthenticated requests and `403` for authenticated non-admin users. Missing roles are treated as `user`, while invalid roles fail closed.

There is not yet a production management API. The price write endpoint remains development-only and requires the `PRICE_WRITE_TOKEN` environment variable and matching `x-development-price-token` header:

- `PUT /api/v1/stores/:storeId/prices/:variantId`

The server validates both references, amount, ISO currency, source, date, and the exact variant package. Do not enable this development path in production; the development token is not a substitute for administrator authorization. Current-price and history writes are sequential because the existing MongoDB connection lifecycle does not establish a replica-set transaction; callers should treat a history-write failure as an operational error requiring reconciliation.

Administrator store management is available through the protected endpoints below. Each route requires the existing session cookie and a persisted `admin` role:

- `GET /api/v1/admin/stores?page=1&limit=20&search=...&status=active|inactive|all`
- `POST /api/v1/admin/stores`
- `PATCH /api/v1/admin/stores/:storeId`
- `PATCH /api/v1/admin/stores/:storeId/status` with `{ "isActive": true|false }`

Store deactivation updates `isActive` and retains the store document and all related historical data. Store updates accept only explicit editable fields; MongoDB operators, IDs, timestamps, and roles are not accepted from clients.

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
