# Estates

An **estate** is the composition boundary — the thing `eco up` actually brings up. It is the primary scaling and deployment unit.

## Machine boundary vs composition boundary

Two boundaries, deliberately not 1:1:

- **Machine boundary** — one Proxmox CT
- **Composition boundary** — one application estate

A CT hosts one or more estates. Small estates can share a CT; large or sensitive ones get a CT of their own.

## One CT, multiple estates

Multiple estates may share one CT, each declared by its own `ecompose.yml` and brought up independently:

```
/opt/projects/<project>/
├── ecompose.yml          # the estate manifest
├── <domain>/<service>    # composed domains cloned below the estate root
└── ecosystem.config.js   # generated PM2 config (CT-local)
```

Sharing is safe because every estate keeps its own:

- root directory
- generated state (`.configure-state`, `.env`)
- ports (random free ports in 20000–27999, persisted)
- PM2 processes
- databases (per-project roles)

### Per-estate generated state

Never commit these — they are CT-local generated state:

- `.configure-state`
- `ecosystem.config.js` / `ecosystem.config.cjs`
- `Caddyfile`
- `.env` files
- `.Eco/deploy/`

## Ports are per-estate by design

- **Service ports**: allocated random free ports in 20000–27999 on first prod
  deploy, preserved forever via the **resource registry** (see [The Resource
  Registry](/concepts/registry)). Dev-port examples in `.env.example` (e.g.
  `SERVER_PORT=8080`) are never a reason to pin a fresh estate to a well-known
  port.
- **Gateway port**: each estate's Caddy gateway binds a distinct internal port
  (never public 80), allocated from the registry.
- **Webhook port**: each estate's GitHub deploy receiver gets its own free
  private port in 20000–27999, persisted in `.eco/deploy/github-webhook.json`
  or set explicitly with `deploy.github.webhook_port`.

Port uniqueness is a **CT-wide** concern — every service, gateway, and webhook
port across all estates on one CT must be distinct. The registry's
`(scope, port)` unique index enforces this: a port is allocated once and
returned unchanged on every later run.

## Databases are multi-tenant by project

- **PostgreSQL**: each project gets its own role `<project>_user` and its own databases
- **MongoDB**: per-estate databases over the local `mongod`

`eco up` creates missing databases and env keys but never silently wipes existing project data.

## Exposure

The preferred application exposure chain:

```
Cloudflare Tunnel -> proxy CT cloudflared -> estate gateway -> estate services
```

One public hostname per estate, one internal gateway, path-based routing into the estate's services.
