# CLI Commands

Eco is a **single compiled Rust binary** — no Node.js, no interpreter, no
`node_modules`. It is installed once per machine (developer machine, host, CT)
and runs everywhere with the same behavior.

## Setup commands

| Command | Purpose |
| --- | --- |
| `eco startproject` | Scaffold a new estate + publish the estate repo |
| `eco init` | Make a directory a project root (scaffolds `ecompose.yml`) |
| `eco update` | Self-update the eco binary to the latest release |
| `eco show` | Show the composed project structure |

## Runtime commands

| Command | Purpose |
| --- | --- |
| `eco up dev` | Local dev mode (build + run the estate on your machine) |
| `eco up --remote` | Build locally + ship + deploy to the Proxmox host |
| `eco up --remote --staging` | Deploy to the staging footprint |
| `eco configure` | Wire env, ports, PM2/systemd, gateway |
| `eco provision` | Install declared runtimes from `ecompose.yml` (dev machine) |
| `eco serve <name>` | Expose a locally-running dev app at a public `https://<name>.getecosphere.com` URL |
| `eco serve stop <name>` | Stop + release the tunnel |
| `eco serve list` | List active tunnels on this host |

## Operational commands

| Command | Purpose |
| --- | --- |
| `eco git ...` | Cross-repo operational git helper |
| `eco ct ...` | Proxmox CT lifecycle (host-side) |
| `eco expose` | Public exposure / Cloudflare tunnel |
| `eco prox ...` | Proxy CT + tunnel + infrastructure CT management |
| `eco lxs ...` | Compose versioned LXS capabilities from the registry |
| `eco stress` | Run a k6 stress test against the estate |
| `eco sync` | Stream production databases to the dev machine |
| `eco sendemail` | Send an email through the estate's mail provider |
| `eco help` | Usage help |

## Account commands

| Command | Purpose |
| --- | --- |
| `eco signup` | Create a managed-estate account (host-side agent) |
| `eco login` / `eco logout` | Store API credentials for the agent |
| `eco whoami` | Show the authenticated account |

## Diagnostics

```bash
eco up --remote --dry-run   # preview the remote deploy plan
eco up dev --dry-run        # preview the local plan
eco provision --plan        # preview runtime provisioning
eco prox showports          # list every port variable across .env files
eco prox clearenv           # remove .env + reset port state (force reallocation)
```

## Host-side vs workspace-side

- **Host-side** (`eco ct`, `eco prox`, `eco expose`, `eco serve` agent): runs
  on the Proxmox host — wraps `pct`, creates/configures CTs, manages tunnels
- **Workspace-side** (`eco up dev`, `eco up --remote`, `eco configure`,
  `eco provision`): runs on the developer machine — reads `ecompose.yml`,
  builds, ships, provisions runtimes, generates `.env`, starts services

## `eco up --remote` contract

A successful remote deploy leaves the estate **bootable**, not merely
package-installed:

- shipped binaries and frontend dist installed into the CT (no in-CT build)
- `.env` files created/normalized from the resource registry
- databases started and created when declared; Rust migrations applied
- PM2 config + systemd units generated and services restarted (verified active)
- gateway config generated and runnable if exposure is enabled
- Cloudflare tunnel targeting the gateway if enabled
