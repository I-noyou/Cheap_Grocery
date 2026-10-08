# Location development note

Cheap Grocery requests browser location only after a signed-in user chooses **Allow Location**. Browser geolocation works on `localhost` during development. Production deployments must use HTTPS because browser geolocation requires a secure context.
