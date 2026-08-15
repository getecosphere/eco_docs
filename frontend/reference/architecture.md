# Architecture

Eco is a host-native DDD platform. The doctrine is intentionally opinionated.

## The model

- one Proxmox CT = one machine boundary (may host one or more estates)
- one Eco = one composition/orchestration layer, a compiled Rust binary
- one repo = one subsystem / bounded context
- the estate core repo holds `ecompose.yml` and the primary `frontend/`

## Design principles

1. **Per-application isolation, not per-service isolation** — isolation comes from the CT at the application boundary
2. **Eco is the sanctioned orchestrator** — composition, provisioning, wiring converge here
3. **Subsystems are composed explicitly** — reusable capabilities from the LXS registry, source from the developer workspace
4. **Runtime wiring is an architectural concern** — ports, `.env`, secrets, systemd are boundary enforcement
5. **Dependencies visible at composition time** — declared and enforced during setup
6. **Reproducibility from multiple layers** — CT boundary + shipped source + `ecompose.yml`
7. **Domains are reusable composition units** — not just code modules
8. **Domain independence is mandatory** — self-standing contract, persistence, runtime assumptions

## Execution model

Eco is a **compiled Rust binary**:

- Rust provides the canonical CLI interface and all command logic
- bundled Bash scripts (`configure.sh`, `provision.sh`, `git.sh`, `install-*.sh`) are embedded in the binary via `include_str!` and extracted to a cache dir on first run

No Node.js is needed anywhere in the pipeline.

## Build model

Builds happen **on the developer machine**:

- Rust services are cross-compiled for `x86_64-unknown-linux-musl`
- frontends are built (and Node backends Bun-compiled into single binaries) locally
- `eco up --remote` ships source + artifacts to the `eco serve` agent on the Proxmox host
- the CT installs the artifacts and runs them — it never compiles anything

## Gateway contract

- gateway implemented with Caddy
- generated and managed by Eco
- systemd-managed service inside the app CT
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

## CT runtime

Services run as **systemd units** (with cgroup resource limits and journald
logs), not PM2. PM2 remains a local dev convenience.

## Why this exists

This avoids Docker-per-service development while preserving operational discipline. `provision.sh` + `ecompose.yml` replace the prepared runtime image aspect; `configure.sh` handles runtime wiring; the CT provides the outer machine boundary.
