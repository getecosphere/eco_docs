# Quick Start

This page walks through the actual command flow for a complete estate lifecycle.

## Local development

```bash
# From the estate root (where ecompose.yml lives)
eco up
```

This behaves like `docker compose up`. Eco:

1. Reads `ecompose.yml` from the current directory
2. Clones any missing composed domain repos
3. Provisions the declared runtimes
4. Generates `.env` files
5. Generates the PM2 ecosystem config
6. Builds and starts services in dependency-aware order

Stop log tailing with `Ctrl+C` — services keep running under PM2.

## Production deployment

On the Proxmox host:

```bash
cd /root/<project>_bootstrap
eco up
```

In production `eco up` also:

- Creates or reuses the declared CT
- Syncs all domain source repos into the CT
- Builds Rust services (optionally on a dedicated builder CT)
- Creates databases and runs migrations
- Generates the Caddy gateway config
- Provisions the Cloudflare tunnel + DNS record
- Registers GitHub webhooks (if `deploy.github.enabled`)

## After changes

```bash
cd /root/<project>_bootstrap && git pull && eco up
```

Or push to `main` — the webhook triggers an estate-wide redeploy automatically.

## Diagnostics

```bash
eco show           # show the composed project structure
eco provision --plan   # preview runtime provisioning
eco up --dry-run   # preview the up plan
eco prox showports # list all port variables on the CT
```

## Useful command groups

- `eco git ...` — cross-repo git operations
- `eco ct ...` — Proxmox CT lifecycle
- `eco expose` — public exposure / tunnel management
- `eco prox clearenv` — force port reallocation

See the [CLI reference](/reference/cli) for the full list.
