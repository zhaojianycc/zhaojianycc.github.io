# Management Center

`management/` is the unified internal entry point for the four shared Management modules. It reads the existing encrypted payloads from their source directories and decrypts them in the visitor's browser after one password entry. The SOA Dashboard remains an independent entry at `../SOA-dashboard/`.

The password and decrypted data are never written to persistent browser storage. Individual module directories remain the source of truth for their publisher projects.
