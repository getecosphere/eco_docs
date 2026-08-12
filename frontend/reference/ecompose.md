# ecompose.yml

`ecompose.yml` is the estate manifest — the source of truth for project runtime composition and the default CT metadata. It should behave like a simplified, host-native `docker-compose.yml`.

## Full example

```yaml
# Version 5
project: stuff8

ct:
  id: 101
  hostname: stuff8
  template: local:vztmpl/eco-npm-rust-mongo_1_amd64.tar.zst
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

deploy:
  github:
    enabled: true
    branch: main
    debounce_ms: 15000
    webhook_port: 8790
    webhook_path: /__eco/github/deploy

storage:
  minio:
    ct: storage
    region: us-east-1

shared_tools:
  - git
  - openssh-client
  - curl
  - jq
  - ca-certificates

domains:
  - auth
  - photos
  - inventory
  - marketplace
  - bidding
  - stuff8_core
  - chat
  - profile
  - notifications

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
```

## Top-level keys

| Key | Purpose |
| --- | --- |
| `project` | The estate/project name |
| `ct` | Proxmox CT metadata used by `eco ct create` |
| `expose` | Public exposure metadata |
| `deploy` | GitHub webhook deployment |
| `storage` | S3-compatible MinIO declaration |
| `shared_tools` | OS packages installed by `provision.sh` |
| `domains` | Composed domains (from `repos.json`) |
| `services` | Service runtime requirements |

## Services

Each service declares where it lives and what runtimes it needs:

```yaml
services:
  chat-backend:
    path: chat/backend
    runtimes:
      - rust
      - mongodb@7
      - redis@7
```

Supported runtimes include `node@20`, `rust`, `mongodb@7`, `postgresql@15`, `golang`, `redis@7`, `npm`, `pm2`, `maven`.

## Per-estate branch overrides

A domain's branch can be overridden for one estate only:

```yaml
domains:
  - auth: rust-implementation   # this estate uses the rust-implementation branch
  - photos
```

`repos.json`'s `branch` field is always `main` — the shared catalog. Overrides apply wherever a domain's branch would otherwise come from `repos.json`.

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

## CI/CD

```yaml
deploy:
  github:
    enabled: true
    branch: main
    debounce_ms: 15000
    webhook_port: 8790
    webhook_path: /__eco/github/deploy
```

Webhook registration belongs to `eco up`, not manual repo-by-repo server setup.
