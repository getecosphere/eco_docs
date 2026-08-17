# Composition

Composition is how Ecosphere turns independent domains into a working application estate. It is a Docker-like developer experience built natively — no containers.

## The Docker analogy

| Docker | Ecosphere |
| --- | --- |
| image defines runtime | `ecompose.yml` defines runtime requirements |
| compose defines service topology | `provision.sh` installs declared runtimes |
| containers define isolation | Proxmox CT defines the outer boundary |

This is not Docker reimplemented. It is a host-native Compose-and-image-like workflow where services run natively inside one CT.

## The pieces

- **`ecompose.yml`** — declares the estate: CT metadata, shared tools, services, runtimes, domains, exposure
- **`provision.sh`** — installs the declared runtimes on the dev machine (prod CTs install only runtime deps)
- **`configure.sh`** — wires ports, `.env`, shared JWT state, PM2/systemd definitions
- **The LXS registry** — the catalog of reusable versioned capabilities

## Estate repo

`eco startproject` creates the estate repository (suggested `<project>_core`),
owning `ecompose.yml` and the primary `frontend/`. There is no separate
`*_bootstrap`/`*_composition` pair for new estates; the estate repo self-declares
its git origin in `ecompose.yml` (`composition.git`).

## Composition contract

- **Per-application isolation, not per-service isolation** — isolation is provided by the CT at the application boundary
- **eco is the sanctioned orchestrator** — workspace composition, provisioning, and wiring converge here
- **Dependencies are visible at composition time** — a `requires` relationship is declared and enforced during setup
- **Runtime wiring is an architectural concern** — port assignment, `.env`, secrets, and systemd definitions enforce boundaries

## Frontend peer URLs

A frontend composing sibling domains declares their URLs in `.env.example`:

```
PUBLIC_PROFILE_URL=
PUBLIC_PHOTOS_URL=
```

eco's `resolve_vite_public_peer_urls` fills them — `localhost:<port>` in dev, the matching `expose.additional` hostname in prod.

## Never fix .env directly

`.env` files are generated, CT-local state. If a service needs a new env var, the fix belongs in eco or in the tracked manifest/`.env.example` — never by hand-editing a deployed `.env`. After the eco-level change, re-run `eco up` so the generated env is correct and survives redeploys.
