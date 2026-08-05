# Composition

Composition is how Eco turns independent domains into a working application estate. It is a Docker-like developer experience built natively — no containers.

## The Docker analogy

| Docker | Eco |
| --- | --- |
| image defines runtime | `ecompose.yml` defines runtime requirements |
| compose defines service topology | `provision.sh` installs declared runtimes |
| containers define isolation | Proxmox CT defines the outer boundary |

This is not Docker reimplemented. It is a host-native Compose-and-image-like workflow where services run natively inside one CT.

## The pieces

- **`ecompose.yml`** — declares the estate: CT metadata, shared tools, services, runtimes, domains, exposure, CI/CD
- **`provision.sh`** — installs the declared runtimes and binaries (idempotent, CT-wide)
- **`configure.sh`** — wires ports, `.env`, shared JWT state, PM2 definitions
- **`repos.json`** — the domain catalog for composition

## Bootstrap + composition repos

`eco startproject` creates two repositories:

- **`<project>_bootstrap`** — lightweight estate deployment definition (`ecompose.yml`)
- **`<project>_composition`** — orchestrates domains into the user experience, holding the primary `frontend/`

## Composition contract

- **Per-application isolation, not per-service isolation** — isolation is provided by the CT at the application boundary
- **Eco is the sanctioned orchestrator** — workspace composition, provisioning, and wiring converge here
- **Dependencies are visible at composition time** — a `requires` relationship is declared and enforced during setup
- **Runtime wiring is an architectural concern** — port assignment, `.env`, secrets, and PM2 definitions enforce boundaries

## Frontend peer URLs

A frontend composing sibling domains declares their URLs in `.env.example`:

```
PUBLIC_PROFILE_URL=
PUBLIC_PHOTOS_URL=
```

Eco's `resolve_vite_public_peer_urls` fills them — `localhost:<port>` in dev, the matching `expose.additional` hostname in prod.

## Never fix .env directly

`.env` files are generated, CT-local state. If a service needs a new env var, the fix belongs in Eco or in the tracked manifest/`.env.example` — never by hand-editing a deployed `.env`. After the Eco-level change, re-run `eco up` so the generated env is correct and survives redeploys.
