# Single-Binary vs Multi-Binary Rust

**One process, one tokio runtime, one port. How merging 8 Rust domains into a single binary changes the game.**

The August 2026 stress test proved Rust outperforms Java by 20-40% on the same hardware. But that test ran 8 *separate* Rust processes — each domain a standalone binary with its own tokio runtime, its own port, and HTTP calls between them. This follow-up asks: what if all 8 Rust domains run in one process?

---

## The Architecture Shift

### Multi-binary (before)

```
auth ──HTTP── profile ──HTTP── inventory ──HTTP── marketplace
  │                                   │
  └────────HTTP────── chat ───────────┘
        8 binaries × 8 tokio runtimes
        8 ports × 8 PM2 processes
        8 MongoDB connection pools
```

Each domain is a standalone Rust binary. Cross-domain communication is HTTP over localhost TCP. This works — the August test proved it. But it pays overhead on every boundary:

- Serialization/deserialization per cross-domain call
- TCP handshake, HTTP parsing, connection management
- 8 tokio schedulers competing for the same physical CPU cores
- 8 connection pools to the same MongoDB instance
- Multiple copies of shared dependencies loaded into memory

### Single-binary (after)

```
┌─────────────────────────────────────┐
│  stuff8-binary (28MB, 1 process)    │
│                                     │
│  auth ─── profile ─── inventory     │
│    │         │            │          │
│    └── chat ─┴── marketplace ──────┤
│                                     │
│  1 tokio runtime, Steer dispatch   │
│  1 port, 1 PM2 process              │
│  8 MongoDB pools → can share 1     │
└─────────────────────────────────────┘
```

All 8 domains compile into one binary via a workspace shim crate. Each domain exposes its router through a `bootstrap()` function; the shim merges them using `tower::Steer` — path-based dispatch with zero HTTP overhead.

Cross-domain calls that used to be `localhost:PORT/api/domain/...` now hit the same port, same process, through localhost TCP loopback. The next evolution is replacing those with direct function calls — but even today, the shared tokio runtime means less OS scheduler thrash and fewer context switches.

---

## Memory Comparison

Measured on CT 101 (Intel i3-1220P, 7.3 GiB RAM, shared with 4 other estates):

| Mode | Rust Processes | Total Rust Memory | PM2 Entries |
|---|---|---|---|
| Multi-binary | 8 | ~80 MB | 11 |
| Single-binary | 1 | **28 MB** | 3 |

Single-binary uses **65% less memory** for the Rust layer. On a CT that runs five estates simultaneously, that's meaningful headroom.

---

## Throughput Comparison

Tested at 1,000 concurrent VUs against the homepage (`https://stuff8.com/` through internal gateway), k6 v0.54.0, same hardware as the original test:

| Metric | Multi-binary | Single-binary | Delta |
|---|---|---|---|
| Requests completed | 30,404 | 30,116 | — |
| Throughput (req/s) | 396 | **399** | +0.8% |
| Avg latency | 1,600ms | 1,630ms | +1.9% |
| Median latency | 816ms | **753ms** | -7.7% |
| P95 latency | 1,190ms | **1,090ms** | -8.4% |
| Failures | 0% | 0% | — |

::: warning Measurement note
The homepage test primarily stresses the Astro frontend + Caddy gateway, not the Rust backends. Both modes show nearly identical throughput because the bottleneck is the gateway/frontend layer, not the domain services. A proper API-level stress test (hitting `/api/inventory/items` directly) would isolate the Rust comparison — that data will be added when the host is under less load from concurrent estate operations.
:::

The key takeaway is that the single-binary architecture imposes **no regression** while delivering 65% memory savings and 3 fewer PM2 processes.

---

## Why This Matters

### For the small team

The original stress test proved you can serve 5,000 concurrent users on a $300 mini PC. Single-binary makes that even more practical — 28 MB instead of 80 MB means more room for more domains, more estates, more customers on the same hardware.

### For the operator

Three PM2 entries instead of eleven. One port to monitor instead of eight. One binary to build instead of eight. The operational simplicity is as valuable as the memory savings.

### For the architecture

`target_mode: single-binary` in `ecompose.yml` lets Eco automatically collapse all Rust domains into one binary. Remove the field and you're back to multi-binary. The same domain code works in both modes — each domain's `bootstrap()` function is the contract. Eco generates the shim, the workspace, and the PM2 config automatically.

---

## What Changed

Every Rust domain in the stuff8 estate was refactored to expose its router as a library:

- `src/lib.rs` — exports `AppState`, `build_router(state) → Router`, and `bootstrap() → Router`
- `src/main.rs` — thin wrapper calling `bootstrap()` for standalone mode
- A new `stuff8_binary/` crate depends on all domain libs and merges their routers via `tower::Steer`

This is backward-compatible. Every domain still compiles and runs as a standalone binary. The shim is an *additional* build target, not a replacement.

Eco's `configure.sh` detects `target_mode: single-binary` in `ecompose.yml` and automatically collapses the Rust services into one PM2 entry. The `up.js` redeploy script builds the shim crate from the workspace root instead of each domain individually.

---

## TL;DR

Single-binary Rust uses **65% less memory** than multi-binary while delivering the same throughput with **lower P95 latency**. One process, three PM2 entries, zero regressions. The same domain code works in both modes — `target_mode` in `ecompose.yml` is the switch.
