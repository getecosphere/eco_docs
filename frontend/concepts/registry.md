# The Resource Registry

When one CT hosts several estates, every service, gateway, and database needs
an identity that never changes — otherwise a redeploy or a second estate can
silently grab a port another estate is already using. Eco keeps that
authoritative record in a **per-machine resource registry**: a small local
SQLite database that owns the allocation of every managed port and database
credential.

## Why a registry

Before the registry, ports lived in ephemeral `.env` files and a
`.configure-state` marker. That worked for one estate but had two problems:

- **Cross-estate collisions** — nothing stopped two estates on the same CT
  from picking the same random port.
- **No durable identity** — deleting a `.env` file meant the next `eco up`
  allocated a *new* port, silently breaking the tunnel origin, PM2 config,
  and every database link that referenced the old one.

The registry makes port identity durable and CT-wide. A port is allocated
**once and never changes**; every later run returns the same assignment.

## Where it lives

- **Dev machine** — `~/.eco/registry.db`
- **Root CT** — `/etc/eco/registry.db`

A companion key file (`<db>.key`, mode 0600) holds the AES-256-GCM key used
to encrypt database passwords before they are stored. The registry path can
be overridden with `ECO_REGISTRY_PATH`; the allocation scope with
`ECO_REGISTRY_SCOPE` (defaults to the hostname).

The registry is backed by SQLite via the `sql.js` WASM build — no native
binary, so it runs identically on Linux CTs, Apple Silicon, and old Intel
Macs.

## Scope: one collision-free namespace per machine

Rows are scoped by **hostname** (the `scope` column). On a dev laptop or a
shared CT, every estate writes into the same database under the same scope,
so the allocation namespace is shared and collision-free by construction.
Unique indexes prevent two services (or a service and the gateway) from ever
holding the same `(scope, port)`.

## What it tracks

- **`ports`** — every allocated port: scope, project, service, port type
  (service / gateway / index), env var name, allocation timestamp.
- **`dbs`** — every managed database: scope, project, service, database
  type (mongodb / postgres / redis), port, db name, username, and an
  encrypted password.
- **`reserved_ports`** — system ports that can never be allocated to an app
  (mongod `27017`, postgres `5432`, redis `6379`).
- **`ranges`** — the allocatable port range per port type (default
  `20000–27999`).

## Allocation rules

- **`get-or-allocate`** returns the existing assignment, adopts a legacy port
  on first migration, and only allocates a fresh random port for a genuinely
  new service. Preferred ports are honored on the first allocation only.
- **`pin`** fixes a service to an explicit port; it rejects reserved ports,
  in-use ports, and ports already owned by another service.
- **`seed`** adopts an existing port without an in-use check — used when
  migrating a running service into the registry.
- **`release` / `reset`** free a service's or project's rows so the next run
  reallocates. Reset clears the service's `dbs` rows too.

## CLI surface

```bash
eco ports list                 # every reserved + allocated port
eco ports pin <service> <port>
eco ports release <service>    # free one service
eco ports reset                # free the whole project
eco ports reserved             # system-reserved ports
eco ports dbs                  # managed databases for the project
eco dashboard [ctid]           # live estate summary from the registry + PM2
```

## Consistency

Every read-modify-write is serialized by a **file lock** (`<db>.lock`). The
lock is held only for the milliseconds it takes to read-modify-write the
database, then released — it is never held for the duration of an `eco up`.
The lock is crash-safe: it records its owner (host + PID + timestamp), and a
dead or hung owner is reclaimed automatically, so a killed `eco` process can
never leave the registry permanently locked.

## Recovery when the database is deleted

Deleting `registry.db` is the worst failure mode, because ports are
immutable. Two layers make it recoverable without any port changing:

1. **Shadow backup** — every write keeps `registry.db.prev`, a copy of the
   last good database. Revert with:

   ```bash
   mv /etc/eco/registry.db.prev /etc/eco/registry.db
   ```

2. **Live-state harvest** — if no backup exists, the next `eco up`
   reconstructs the exact ports from the PM2 daemon's live process env
   (`pm2 jlist`) instead of allocating fresh. Recovery order per service:
   registry → eco-generated `ecosystem.config.js` → live PM2 env → `.env` →
   fresh random allocation. This protects the tunnel origin, gateway port,
   and every database link.

## Database credentials

Passwords are encrypted with AES-256-GCM before storage; `eco ports dbs`
shows them only with the explicit secret flag. Losing the database also
loses the ability to decrypt old passwords, so keep `<db>.key` backed up
alongside `registry.db`.
