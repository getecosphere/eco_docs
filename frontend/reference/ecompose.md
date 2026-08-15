# ecompose.yml

`ecompose.yml` is the estate manifest — the source of truth for project runtime composition and the default CT metadata. It should behave like a simplified, host-native `docker-compose.yml`.

## Full example

```yaml
# Version 5
project: stuff8

ct:
  id: 101
  hostname: stuff8
  template: local:vztmpl/debian-12-standard_12.12-1_amd64.tar.zst
  storage: local-lvm
  disk: 16
  bridge: vmbr0
  ip: dhcp
  cores: 2
  memory: 4096
  swap: 1024
  unprivileged: 1

expose:
  enabled: true
  hostname: stuff8.com
  service: stuff8-frontend
  proxy_ct: proxy
  cloudflare_account: stuff8
  additional:
    - hostname: photos.stuff8.com
      service: photos-backend

storage:
  minio:
    ct: storage
    region: us-east-1

services:
  stuff8-frontend:
    path: stuff8_core/frontend
    runtimes:
      - node@20
  auth-backend:
    path: auth/backend
    runtimes:
      - rust
      - mongodb@7
  notifications-backend:
    lxs: notifications@1.0.0
    grants:
      secrets: [JWT_SECRET, MONGODB_URI]
```

## Top-level keys

| Key | Purpose |
| --- | --- |
| `project` | The estate/project name |
| `ct` | Proxmox CT metadata used by `eco ct create` |
| `expose` | Public exposure metadata |
| `storage` | S3-compatible MinIO declaration |
| `domains` | Composed domains (legacy catalog form; source domains can also be composed via `services[].path`) |
| `services` | Service runtime requirements |
| `staging` | A second footprint on another CT, deployed with `eco up --remote --staging` |

## Services

Each service declares where it lives (a `path:` source dir, or an `lxs:`
registry capability) and what runtimes it needs:

```yaml
services:
  chat-backend:
    path: chat/backend
    runtimes:
      - rust
      - mongodb@7
      - redis@7
  chat-gateway:
    lxs: chat@1.0.0
    grants:
      secrets: [JWT_SECRET, REDIS_URL]
```

Supported runtimes include `node@20`, `rust`, `mongodb@7`, `postgresql@15`,
`golang`, `redis@7`, `npm`, `maven`.

### Source vs LXS

- **`path:` services** ship from the developer workspace via `eco up --remote`.
  The source is built on your machine and the artifact installed into the CT.
- **`lxs:` services** are resolved from the LXS registry by version — the
  compiled binary is pulled, installed, and run; no source and no build step
  at all.

## Per-estate branch overrides

There is no central `repos.json` catalog anymore. A `path:` service ships
whatever source the developer workspace has checked out, so the deployed code
is exactly the local revision. The `domains:` list with branch overrides
(`- auth: rust-implementation`) remains supported for legacy manifests.

## Exposure

```yaml
expose:
  enabled: true
  hostname: stuff8.com
  service: stuff8-frontend
  proxy_ct: proxy
  cloudflare_account: stuff8
```

- One public hostname per estate
- `service` is the primary frontend receiving traffic at the gateway root (`/`)
- `proxy_ct` is the CT running `cloudflared`
- `cloudflare_account` selects the Cloudflare credentials on the host

### Additional hostnames

For services that can't share the path-based HTTP gateway (e.g. a raw WebSocket game server):

```yaml
expose:
  additional:
    - hostname: ws-chronic.battlerivals.online
      service: gameserver
```

## Staging

A second footprint on a separate CT, deployed explicitly:

```yaml
staging:
  ct: 1000
```

`eco up --remote --staging` provisions and deploys it at `staging-<hostname>`.
