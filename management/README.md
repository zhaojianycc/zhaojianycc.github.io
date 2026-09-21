# Management Center

`management/` is the unified internal entry point for the five Management modules. It reads the existing encrypted payloads from their source directories and decrypts them in the visitor's browser after one password entry.

The password and decrypted data are never written to persistent browser storage. Individual module directories remain the source of truth for their publisher projects.
