# Architecture

Eco is building a host-native DDD platform. The doctrine is intentionally opinionated.

## The model

- one Proxmox CT = one machine boundary (may host one or more estates)
- one Eco = one composition/orchestration layer installed once per CT, shared by every estate
- one repo = one subsystem / bounded context
- `*_bootstrap` repos hold estate deployment definitions (`ecompose.yml`)
- `*_composition` repos orchestrate domains into the user experience, holding the primary `frontend/`

## Design principles

1. **Per-application isolation, not per-service isolation** — isolation comes from the CT at the application boundary
2. **Eco is the sanctioned orchestrator** — composition, provisioning, wiring converge here
3. **Subsystems are composed explicitly** — `repos.json` is the source of truth
4. **Runtime wiring is an architectural concern** — ports, `.env`, secrets, PM2 are boundary enforcement
5. **Dependencies visible at composition time** — declared and enforced during setup
6. **Reproducibility from multiple layers** — CT boundary + repo revisions + `ecompose.yml`
7. **Domains are reusable composition units** — not just code modules
8. **Domain independence is mandatory** — self-standing contract, persistence, runtime assumptions

## Execution model

Eco uses a hybrid model:

- Node provides the canonical CLI interface
- bundled Bash scripts provide the working workspace-side execution

Migration strategy: keep Node as the stable CLI surface, keep proven Bash behavior, move logic to Node only where structure clearly benefits, and implement new host-side capabilities directly in Node.

## Gateway contract

- gateway implemented with Caddy
- generated and managed by Eco
- normal PM2-managed service inside the app CT
- binds an internal estate port (not public 80)
- Caddy admin API off (avoid `127.0.0.1:2019` collisions)

Routing convention:

- `/` → primary frontend
- `/api/*` → primary project backend
- `/auth-api/*` → auth backend (path rewrite to `/api/*`)
- `/api/auth/*` → auth backend compatibility path

Auth stays a separate reusable domain internally, but externally it does not require its own hostname.

## Exposure chain

```
Cloudflare Tunnel -> proxy CT cloudflared -> estate gateway -> estate services
```

For admin access (not estate traffic), Tailscale is used separately with the Proxmox host as a subnet router.

## Why this exists

This avoids Docker-per-service development while preserving operational discipline. `provision.sh` + `ecompose.yml` replace the prepared runtime image aspect; `configure.sh` handles runtime wiring; the CT provides the outer machine boundary.
