# Deploy without webhooks

> The build farm is on each developer machine. Deploys are explicit, not
> webhook-triggered.

## The repos

Eco is split into two repos under `github.com/ecosphere-creator`:

- **`eco`** (public) — the inspectable CLI: `eco up --remote`, `lxs`, `ports`,
  `show`, `startproject`, `compose`, systemd units, host-builder, Bun. No
  secrets, no agent, no `repos.json`. Anyone can audit that the CLI does
  nothing sneaky.
- **`eco-server`** (private) — the control plane: the `serve` agent that drives
  CT deploys on the Proxmox host (pct orchestration, cloudflare/tunnels, the
  ports registry, `configure.sh`). The business stays in the server.

The public CLI talks to the private server over the agent HTTP API + API key —
a clean, inspectable boundary.

## The old model: webhook-driven deploys

Previously a deploy was wired to GitHub: a push to the deploy branch fired a
**webhook**, the CT pulled the new source, built it (Rust + `npm ci` + frontend
build), and PM2 restarted the services. The CT was both a build farm and a
runtime, and a webhook receiver (`github-webhook-receiver.js`) lived on the CT
to orchestrate that.

## Why the webhook is gone

Everything shifted the build off the CT:

1. **Dev toolchain-free CTs** — the CT no longer compiles anything. It only
   runs artifacts (Rust binaries, Bun-compiled node binaries, static dist).
2. **The build farm moved to the developer machine** — `eco up --remote`
   cross-compiles + Bun-compiles on the dev machine and ships artifacts over
   the agent. There is nothing for a webhook to trigger *on the CT* anymore.
3. **A webhook can't run your build farm.** A GitHub push event arrives on a
   server, not on your laptop — so it can't start the local build. The deploy
   had to become *explicit*, from a machine that can build.

## The new model: dev- or CI-initiated deploys

```
developer machine                       Proxmox host                     CT
─────────────────                       ───────────────                   ─────
eco up --remote ──► build + Bun + ship ──► eco serve agent ──► installs ──► systemd runs it
  (or CI runner)                            (deploy endpoint)             (no git, no build)
```

- **Dev-initiated** (the daily loop): `eco up --remote` from the developer
  machine. That's it — no webhook, no git hooks, no server-side triggers.
- **CI-initiated** (optional, for teams): a GitHub Actions workflow on the
  deploy branch that runs `eco up --remote` against the agent. Same build +
  ship path, just started by CI instead of a human:

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
            ECO_API_URL: ${{ secrets.ECO_API_URL }}   # https://<host>:8790
            ECO_API_KEY: ${{ secrets.ECO_API_KEY }}
            ECO_LXS_REGISTRY: ${{ runner.temp }}/lxs-registry
          run: |
            git clone https://github.com/getecosphere/lxs-registry.git $ECO_LXS_REGISTRY
            curl -fsSL https://bun.sh/install | bash
            export PATH="$HOME/.bun/bin:$PATH"
            eco up --remote
  ```

  This is the same pattern as the LXS registry's own CI
  (`.github/workflows/lxs-publish.yml`): CI builds, then publishes/ships.

## What this removes

- The GitHub **webhook receiver** on the CT (formerly the Node
  `github-webhook-receiver.js`, then a `webhook-server` concept that never
  shipped in the Rust binary) plus `deploy.github` in ecompose.yml and the
  generated `redeploy.sh`. All of it is gone — not kept for old estates.
- The CT's job as a git consumer: no source pull, no `git clean`, no build
  steps, no `npm ci` for builds on the CT.
- The shared builder CT as a deploy trigger.

## What it keeps

- `eco serve` agent on the host (the deploy endpoint) — the single entry point
  for dev/CI deploys.
- Systemd units as the CT runtime (see [PM2 → systemd](pm2-to-systemd)).
- LXS from the registry (see [Dev-toolchain-free CTs](dev-toolchain-free-cts)).
