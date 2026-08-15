# Deploy — explicit, from the machine that builds

Eco's deploys are **explicit and dev- or CI-initiated**. There is no CI/CD
pipeline to configure and no webhook to wire up: `eco up --remote` *is* the
deploy. The build farm lives on each developer machine, and the same command
that builds also ships.

## How it works

```
developer machine                       Proxmox host                     CT
─────────────────                       ───────────────                   ─────
eco up --remote ──► build + ship ──► eco serve agent ──► installs ──► systemd runs it
  (or CI runner)                        (deploy endpoint)             (no git, no build)
```

From the estate root (where `ecompose.yml` lives):

```bash
eco up --remote             # build locally + ship + deploy to production
eco up --remote --staging   # ...to the staging footprint instead
```

What happens:

1. **Build on your machine** — Rust services are cross-compiled for
   `x86_64-unknown-linux-musl` (static binary, no glibc matching); frontends
   are built (`npm ci` + `vite`/`astro build`) and optionally Bun-compiled
   into a single linux-x64 binary.
2. **Ship to the host** — the source + artifacts travel to the `eco serve`
   agent on the Proxmox host over HTTP (or `scp` on lossy links).
3. **Deploy in the CT** — the agent installs the binaries and dist, provisions
   runtime deps (databases, redis, onnxruntime), applies Rust migrations,
   generates `.env` via `configure.sh`, and restarts the services under
   **systemd**.

## Staging footprint

An estate can declare a second **staging** deployment:

```yaml
staging:
  ct: 1000
```

`eco up --remote --staging` provisions and deploys the staging footprint the
same way as prod — just a different CT and hostname
(`staging-<hostname>`). Which footprint you deploy to is an explicit flag,
never inferred from a branch.

## For teams: CI-initiated deploys

The same build + ship path works from a CI runner. A GitHub Actions workflow
on the deploy branch simply runs `eco up --remote` against the agent:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        env:
          ECO_API_URL: ${{ secrets.ECO_API_URL }}
          ECO_API_KEY: ${{ secrets.ECO_API_KEY }}
          ECO_LXS_REGISTRY: ${{ runner.temp }}/lxs-registry
        run: |
          git clone https://github.com/getecosphere/lxs-registry.git $ECO_LXS_REGISTRY
          curl -fsSL https://bun.sh/install | bash
          export PATH="$HOME/.bun/bin:$PATH"
          eco up --remote
```

## What you don't have to do

- No CI platform to configure for the happy path (optional for teams)
- No pipeline YAML in every repo (optional for teams)
- No webhook receiver on the CT, no `redeploy.sh`, no `deploy.github` block
- No SSH-based deploy scripts per service
- No "how do we deploy?" handbook — `eco up --remote` encoded the answer once

## Why the estate is the deploy unit

Eco's deploys are **estate-scoped**: one `eco up --remote` ships the whole
estate consistently. This matches the domain model — the estate is the
deployment unit, so the pipeline runs at estate granularity, not per-repo.

## First-class benefits

- **Always in sync** — deploys are estate-wide, so composed domains can't drift
- **Deterministic** — the shipped source is exactly what the workspace had;
  no server-side rebuild that can differ from your machine
- **Toolchain-free CTs** — no compiler, no npm, no build cache on production
- **Idempotent** — redeploys are the same as first deploys
- **Operational by default** — no pipeline, no lock-in, no extra cost

See [ecompose.yml reference](/reference/ecompose) for the manifest, and
[Deploy without webhooks](/guide/deploy-without-webhooks) for the full story.
