# CI/CD — built in, not bolted on

Eco ships **continuous integration and continuous deployment** as part of `eco up` — there is no separate CI/CD pipeline to configure, no YAML workflows to maintain, no third-party service to wire up. If the estate declares `deploy.github.enabled`, the whole loop is handled automatically.

## How it works

```yaml
deploy:
  github:
    enabled: true
    branch: main
    debounce_ms: 15000
    webhook_port: 8790
    webhook_path: /__eco/github/deploy
```

When `eco up` brings the estate up, it also:

1. **Installs a webhook receiver** on the estate's own gateway (its own private port)
2. **Registers GitHub webhooks** on every repo composed into the estate (all domains, not just the bootstrap)
3. **Exposes the receiver** through the same Cloudflare tunnel + proxy CT chain, under a dedicated deploy hostname

From that moment, the deploy pipeline runs itself.

## The deploy loop

```
push to main ──> GitHub webhook ──> estate receiver ──> debounce ──> estate redeploy
```

1. A developer pushes to `main` on any composed repo
2. GitHub fires the webhook to the estate's receiver
3. Eco **debounces** — it waits `debounce_ms` (default 15 s) so a burst of pushes collapses into one deploy
4. Eco pulls the **latest code across every repo** in the estate (not just the triggering repo)
5. Rust services run their tests (`cargo test`); a service with failing tests keeps its last-good build instead of breaking the estate
6. PM2 reloads the services; the gateway and exposure are already correct

## What you don't have to do

- No CI platform (GitHub Actions, GitLab CI, Jenkins) to configure
- No pipeline YAML to maintain in every repo
- No SSH-based deploy scripts per service
- No "how do we deploy?" handbook — `eco up` encoded the answer once

## Why the estate is the pipeline unit

Eco's CI/CD is **estate-scoped**: pushing to `main` redeploys the whole estate consistently. This matches the domain model — the estate is the deployment unit, so the pipeline runs at estate granularity, not per-repo.

One shared repo composed into many estates gets a webhook registered by each estate, so a single push updates every product that uses that domain. Consistent, and no cross-estate coordination to configure.

## First-class benefits

- **Always in sync** — deploys are estate-wide, so composed domains can't drift
- **Test-gated Rust** — failed tests never take down a running service
- **Idempotent** — redeploys are the same as first deploys
- **Operational by default** — no pipeline, no lock-in, no extra cost

Eco treats CI/CD as an architectural concern of the estate, not an afterthought you add on top. See [ecompose.yml reference](/reference/ecompose) for the `deploy` block, and [Quick Start](/guide/quick-start) for the end-to-end flow.
