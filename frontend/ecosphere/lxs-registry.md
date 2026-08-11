# The LXS Registry

**LXS — Linux Service.** The continuation of LXC (Linux Container) / CT: where
a CT runs binaries, an **LXS is the versioned executable capability** those CTs
compose into an Estate.

The **LXS Registry** is the technical distribution layer of the model — identity,
versions, artifacts, manifests, checksums, contracts, and retrieval. (The
**Marketplace**, the discovery + economics layer, is built on top of it.)

## What is implemented

The registry is a **private git repository** (`lxs-registry`) with one directory
per LXS and one directory per immutable version:

```
lxs-registry/
├── lxs-spec.md              # the canonical lxs.yml manifest schema
├── notifications/
│   └── 1.0.0/
│       ├── lxs.yml          # contract, runtime, provenance, checksums
│       └── linux-amd64/notifications   # the compiled static binary
└── photos/  email-manager/  profile/  chat/
```

Each version is tagged `name-version` and verified by sha256. The manifest
(`lxs.yml`) declares the **contract** — required/optional env, database, network,
resources — plus provenance (source commit, builder, timestamp) and the release
history. A composed LXS is **not** a blind binary: the estate grants it explicit
capabilities (secrets, network), and `eco up` checks the grants satisfy the
contract before deploying.

## Published LXS (first batch)

Converted from the stuff8 supporting domains, all statically linked musl:

| LXS | version | domain | contract |
| --- | --- | --- | --- |
| `notifications` | 1.0.0 | in-app + email delivery, WebSocket push | mongodb, JWT |
| `photos` | 1.0.0 | uploads, image/video processing, S3 | S3, ffmpeg |
| `email-manager` | 1.0.0 | transactional email via Brevo | mongodb, Brevo |
| `profile` | 1.0.0 | user profiles, social links | mongodb, JWT |
| `chat` | 1.0.0 | realtime messaging, Redis pub/sub | mongodb, redis, JWT |

## The workflow

```bash
# Author side (a domain source repo)
eco lxs build                      # cross-compile for linux/amd64 (musl)
eco lxs publish notifications@1.0.0 # write manifest + artifacts + tag

# Estate side
eco lxs search notifications       # browse the catalog
eco lxs verify notifications@1.0.0 # integrity check
```

An estate composes LXS by version in `ecompose.yml` (dual mode — source `path:`
services keep working unchanged):

```yaml
services:
  notifications-backend:
    lxs: notifications@1.0.0
    grants:
      secrets: [JWT_SECRET, MONGODB_URI]
```

`eco up` then pulls the versioned binary from the registry, installs it into the
CT, and lets `configure.sh` handle ports, PM2, and gateway routing exactly as it
does for source services — **without a compiler or build step on the CT**.

## Why binaries

Rust (and Go) compile to a single static binary: no runtime, no build farm on
the server, reproducible and independently distributable. That property is what
makes a capability a **product** — build once, publish once, compose everywhere,
and eventually buy and sell on the Marketplace. Languages that ship a runtime
(JVM, PHP, Python, Node) cannot be packaged that way.

See also: [Introducing LXS](/ecosphere/), [Why Rust & Go?](/ecosphere/why-rust-and-go).
