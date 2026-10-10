# Cheap Grocery

Cheap Grocery is a grocery discovery and shopping helper with a vanilla HTML/CSS/JavaScript frontend and a Node.js + MongoDB backend.

## Current backend status

This repository is in Phase 4: Product Catalog Architecture.

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

### Product import

Use the explicit developer script:

- `cd backend`
- `npm run seed:products`
- `npm run seed:products:dry-run`

The import reads the existing catalog from the frontend `script.js` file, normalizes it, and upserts into MongoDB without deleting existing records.

### Notes

- The frontend still uses the hardcoded catalog in `script.js` as a compatibility fallback while the backend API is introduced.
- The backend API is read-only in Phase 4 and does not create, delete, or mutate user cart or list data.
- The product catalog uses the frontend catalog keys as compatibility categories because the original catalog did not contain a separate category taxonomy.

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
