# CLI Commands

Eco is a Node CLI (`Eco`) with a bundled Bash implementation for workspace-side orchestration.

## Setup commands

| Command | Purpose |
| --- | --- |
| `eco startproject` | Create + publish bootstrap and composition repos |
| `eco init` | Initialize the DDD workspace |
| `eco update` | Refresh the Eco CLI to latest `origin/main` |
| `eco show` | Show the composed project structure |

## Runtime commands

| Command | Purpose |
| --- | --- |
| `eco up` | Bring up the estate (like `docker compose up`) |
| `eco up dev` | Local dev mode with direct per-service ports |
| `eco configure` | Wire env, ports, PM2, gateway |
| `eco provision` | Install declared runtimes from `ecompose.yml` |
| `eco serve <name>` | Expose a locally-running dev app at a public `https://<name>.getecosphere.com` URL |
| `eco serve stop <name>` | Stop + release the tunnel |
| `eco serve list` | List active tunnels on this host |

## Operational commands

| Command | Purpose |
| --- | --- |
| `eco git ...` | Cross-repo operational git helper |
| `eco ct ...` | Proxmox CT lifecycle (host-side) |
| `eco expose` | Public exposure / Cloudflare tunnel |
| `eco proxy ...` | Proxy CT + tunnel management |
| `eco help` | Usage help |

## Diagnostics

```bash
eco provision --plan   # preview runtime provisioning
eco up --dry-run       # preview the up plan
eco prox showports     # list every port variable across .env files
eco prox clearenv      # remove .env + reset port state (force reallocation)
```

## Host-side vs workspace-side

- **Host-side** (`eco ct`, `eco proxy`, `eco expose`): runs on the Proxmox host — wraps `pct`, creates/configures CTs, manages tunnels
- **Workspace-side** (`eco up`, `eco configure`, `eco provision`): runs inside a workspace or CT — reads `ecompose.yml`, provisions runtimes, composes repos, generates `.env`, starts PM2

## `eco up` contract

A successful `eco up` leaves the estate **bootable**, not merely package-installed:

- required runtimes installed
- declared repos present
- `.env` files created/normalized
- one shared non-empty `JWT_SECRET` enforced
- databases started and created when declared
- PM2 generated and services started in dependency-aware order
- gateway config generated and runnable if exposure is enabled
- Cloudflare tunnel targeting the gateway if enabled
