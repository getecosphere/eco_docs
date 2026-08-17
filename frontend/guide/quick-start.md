# Quick Start

This page walks through the actual command flow for a complete estate lifecycle.

## Local development

```bash
# From the estate root (where ecompose.yml lives)
eco up dev
```

This behaves like `docker compose up` on your machine. eco:

1. Reads `ecompose.yml` from the current directory
2. Provisions the declared runtimes locally
3. Generates `.env` files
4. Builds Rust services and installs frontend dependencies
5. Starts services (under PM2 locally)

Stop log tailing with `Ctrl+C` — services keep running.

## Production deployment

From the same estate root, on your developer machine:

```bash
eco up --remote
```

The build farm is *your machine*. `eco up --remote`:

- Cross-compiles Rust services for Linux (`x86_64-unknown-linux-musl`)
- Builds frontends and (optionally) Bun-compiles Node apps to single binaries
- Ships source + artifacts to the `eco serve` agent on the Proxmox host
- Creates or reuses the declared CT
- Installs the shipped binaries and dist (the CT never compiles)
- Creates databases and runs migrations
- Generates the gateway config + `.env` via `configure.sh`
- Restarts services under systemd

## Staging

```bash
eco up --remote --staging    # deploy to the staging footprint (staging.ct)
```

## After changes

```bash
# from the estate root
eco up --remote --staging    # preview on staging
# ...verify...
eco up --remote              # deploy to production
```

No webhook, no push-to-deploy — the deploy is whatever you explicitly run.

## Diagnostics

```bash
eco show                # show the composed project structure
eco up --remote --dry-run   # preview the remote deploy plan
eco up dev --dry-run    # preview the local plan
eco prox showports      # list all port variables on the CT
```

## Useful command groups

- `eco git ...` — cross-repo git operations
- `eco ct ...` — Proxmox CT lifecycle
- `eco serve <name>` — expose a locally-running app at a public URL
- `eco lxs ...` — browse and compose versioned LXS capabilities

See the [CLI reference](/reference/cli) for the full list.
