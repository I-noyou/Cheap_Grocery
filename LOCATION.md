# Location development note

Cheap Grocery requests browser location only after a signed-in user chooses **Allow Location**. Browser geolocation works on `localhost` during development. Production deployments must use HTTPS because browser geolocation requires a secure context.

## Phase 3 store development

The backend creates the `stores` collection and its `location` 2dsphere index when MongoDB is configured. Store reads are available at `GET /api/v1/stores`; authenticated nearby discovery is available at `GET /api/v1/stores/nearby?radiusKm=5&limit=20`.

For local development only, set `STORE_WRITE_TOKEN` in `backend/.env` and send that value in the `x-development-store-token` header to `POST /api/v1/stores`. The endpoint is disabled outside development and does not provide a production admin system.
