# Single-Binary vs Multi-Binary Rust

**The evolution from 8 separate Rust binaries + 1 Go service to a single 31MB Rust binary — and why we still keep cross-domain HTTP for long-term flexibility.**

The [original stress test](/case-study/stress-test) proved Rust outperforms Java by 20-40%. This follow-up tested the same estate on the same hardware after three architectural shifts:

1. **Multi-binary** — 8 separate Rust processes + 1 Go notifications service, each with its own tokio runtime, port, and HTTP calls between them
2. **Single-binary (8 domains)** — 8 Rust domains merged into one binary; Go notifications still separate
3. **Single-binary (9 domains)** — All 9 domains in one binary after rewriting notifications from Go to Rust

---

## The Architecture Shift

### Before: Multi-binary with Go

```
auth ──HTTP── profile ──HTTP── inventory ──HTTP── marketplace
  │                                   │
  └────────HTTP────── chat ───────────┘
        8 Rust binaries × 8 tokio runtimes
        8 ports × 8 PM2 processes
        1 Go notifications service (WebSocket hub, separate process)
        9 MongoDB connection pools total
```

### After: All Rust, single binary (current production)

```
┌──────────────────────────────────────────────┐
│  stuff8-binary (31MB, 1 process)             │
│                                              │
│  auth ─── profile ─── inventory              │
│    │         │            │                   │
│    └── chat ─┴── marketplace ────┤           │
│              │                    │           │
│         notifications ── bidding ─┘           │
│              │                                │
│         email-manager                         │
│                                              │
│  1 tokio runtime, Steer dispatch             │
│  1 port, 1 PM2 process                       │
│  Cross-domain calls: HTTP loopback (127.0.0.1)│
└──────────────────────────────────────────────┘
```

All 9 domains compile into one binary — but **cross-domain calls remain HTTP over localhost TCP**, not function calls. This means the same domain code works identically in both modes: `target_mode: single-binary` (Eco collapses everything into one process) or `target_mode: multi-binary` (Eco deploys each domain as a separate PM2 process).

---

## Process Count & Memory

Measured on CT 101 (Intel i3-1220P, 7.3 GiB RAM, shared with 4 other estates):

| Mode | Rust Processes | Go Processes | Total Processes | Memory |
|---|---|---|---|---|
| Multi-binary | 8 | 1 (notifications) | 12 | ~90 MB |
| Single-binary (8 domains) | 1 | 1 (notifications) | 5 | ~60 MB |
| **Single-binary (9 domains)** | **1** | **0** | **3** | **31 MB** |

---

## Throughput Comparison

Tested at 1,000 concurrent VUs against the homepage (`https://stuff8.com/`), k6 v0.54.0:

| Metric | Multi-binary (8 Rust + 1 Go) | Single-binary (8 Rust) | **Single-binary (9 Rust)** |
|---|---|---|---|
| Throughput (req/s) | 396 | 399 | **400** |
| Avg latency | 1,600ms | 1,630ms | **1,600ms** |
| Median latency | 816ms | 753ms | **809ms** |
| P95 latency | 1,190ms | 1,090ms | **1,110ms** |
| Failures | 0% | 0% | 0% |
| Total processes | 12 | 5 | **3** |
| All-Rust | No | No | **Yes** |

::: info Throughput is identical across modes
The homepage test bottlenecks at the Astro frontend + Caddy gateway, not the Rust backends. The key finding: there is **zero regression** — merging 9 domains into one binary with HTTP loopback has the same performance as running them separately. A function-call optimization would shave microseconds in a test already bottlenecked at 809ms median, so it adds complexity without meaningful user-facing gain.
:::

---

## Cross-Domain Communication: Why HTTP, Not Function Calls

After proving the single binary works, we built a [ports-and-adapters layer](https://github.com/kelastanpatembok/stuff8_bootstrap/pull/...) to replace HTTP loopback with in-process function calls. The port crate defined typed traits (`InventoryPort`, `AuthPort`, `NotificationsPort`, etc.) with the same contract as the HTTP API, and the shim wired them into a shared registry. It compiled and was ready to deploy.

**We decided not to merge it.** The reason:

| Factor | Function calls (ports) | HTTP loopback (current) |
|---|---|---|
| Latency per cross-domain call | ~microseconds (typed, no serialization) | ~hundreds of microseconds (TCP + JSON) |
| Real user impact | None — homepage bottleneck is frontend/gateway at 809ms | Same |
| Multi-binary switch | Requires full refactor — ports break when domains are separate processes | Works unchanged — `target_mode` is the only switch |
| Independent deploy | Not possible — one binary, one restart | `target_mode: multi-binary` → deploy inventory without touching auth |
| Independent scaling | Not possible — one process, one CPU/memory allocation | Each domain gets its own PM2 entry with per-process limits |
| Code simplicity | 6 new trait impls, ~15 call site changes, a shared DTO crate | Each domain just calls `reqwest` against an env-configured URL |
| Isolation risk | Compile-time + runtime enforced via `Arc<dyn Trait>` (no bleed) | Same — HTTP is the contract boundary |

The function-call approach **makes the single-binary mode faster but permanently couples the estate to it.** The HTTP approach gives up a few microseconds in a test where the frontend already takes 800ms, and in exchange you keep the ability to split domains back out without touching a line of domain code.

**`target_mode` in `ecompose.yml` is the only switch.** When you want multi-binary, flip it and redeploy — every domain's `bootstrap()` still works standalone.

---

## How Eco Enables Service-Level Scaling

In a multi-binary estate, Eco's deployment model makes per-service scaling straightforward:

### Horizontal scaling (more instances)

Eco can deploy additional replicas of a busy service on separate CTs. A `scale` block in `ecompose.yml` declares the desired replica count:

```yaml
services:
  marketplace-backend:
    path: marketplace/backend
    scale:
      instances: 3          # run 3 copies
      across: any            # spread across any available CTs
    runtimes:
      - rust
      - mongodb@7
```

Under the hood, Eco:
1. Clones the marketplace repo onto each target CT
2. Builds the Rust binary (or reuses a pre-built artifact)
3. Writes a per-instance `.env` with the shared `MONGODB_URI`, `JWT_SECRET`, etc.
4. Generates a Caddy upstream with all instance addresses:

```
reverse_proxy marketplace           # round-robin across all replicas
```

Because every domain communicates over HTTP, the load-balanced `marketplace-backend` is a drop-in from the perspective of every other service — the gateway routes to any instance, and the in-memory state (WebSocket hubs, caches) is domain-specific and already replication-safe.

### Vertical scaling (more resources)

When the bottleneck is CPU or memory on a single CT, Eco can allocate more:

```yaml
services:
  marketplace-backend:
    scale:
      cpu: 4          # cores (overrides the CT-level default)
      memory: 2048    # MB (overrides the CT-level default)
```

Eco adjusts the CT's resource limits and restarts the service — no code change, no config change in the domain.

### Auto-scaling (future)

Eco already tracks PM2 CPU/memory per process via `pm2 ls` (used in deploy webhook health checks). The next step is a lightweight sidecar that:

1. Reads PM2 metrics for each service every 30 seconds
2. When a service exceeds 80% CPU for 2 consecutive windows, fires `eco scale <service> +1`
3. When a service is below 20% CPU for 5 consecutive windows, fires `eco scale <service> -1` (with a minimum of 1)
4. Regenerates the Caddy upstream and reloads — zero-downtime

This is planned, not built. The infrastructure primitives (PM2 metrics, `eco scale`, Caddy reload) are all in place; the policy engine is the missing piece.

::: tip The single-binary tradeoff
With `target_mode: single-binary`, service-level scaling isn't available — you scale the whole estate or nothing. For small estates serving a few thousand users, that's acceptable (the single 31MB binary handles 1,000 concurrent VUs on a $300 mini PC). For estates expecting a particular domain to spike independently, run multi-binary and add `scale:` blocks for that domain.
:::

---

## The Go → Rust Conversion

The original `notifications` service was a ~500-line Go application providing:

- Persistent notification storage in MongoDB
- REST API for listing, counting, marking read, and ingesting from other domains
- Real-time WebSocket push via an in-memory per-user connection hub
- JWT authentication (HS512, shared across the estate)

The Rust rewrite is functionally identical — same API contract, same MongoDB collections, same WebSocket protocol, same JWT verification. It compiles into the single binary as a library crate exporting `bootstrap()` alongside every other domain.

**Why this matters:** In a single-binary world, every domain must be Rust so the shim crate can link them all. The notifications conversion was the final step to a fully unified Rust estate with zero Go dependencies.

---

## What Changed

1. Every Rust domain was refactored to expose its router as a library (`lib.rs` + `bootstrap()`)
2. A shim crate `stuff8_binary/` was created that depends on all domain libs and merges them via `tower::Steer`
3. The Go `notifications` service was rewritten in Rust and added to the shim
4. `configure.sh` now detects `target_mode: single-binary` and collapses Rust services into one PM2 entry
5. `up.js` builds the workspace shim instead of per-service binaries

---

## TL;DR

- Single binary is a **proven capability**, not the default. `target_mode: single-binary` in `ecompose.yml` is the switch.
- **Same throughput** across all modes — the frontend/gateway is the bottleneck, not the backend topology.
- **31 MB for 9 domains** from one binary vs ~90 MB from 12 processes. Useful on tight hardware, but sacrifices independent scaling.
- **Cross-domain calls use HTTP**, not function calls — so `target_mode: multi-binary` works with zero code changes.
- **Service-level scaling** is available in multi-binary mode via `scale:` blocks in `ecompose.yml`.
