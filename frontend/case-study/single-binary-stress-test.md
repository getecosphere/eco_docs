# Single-Binary vs Multi-Binary Rust

**One process, one tokio runtime, one port. The evolution from 8 separate Rust binaries + 1 Go service to a single 31MB Rust binary serving all 9 domains.**

The [original stress test](/case-study/stress-test) proved Rust outperforms Java by 20-40%. This follow-up tests the same estate on the same hardware after three architectural shifts:

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
        8 ports × 8 process units
        1 Go notifications service (WebSocket hub, separate process)
        9 MongoDB connection pools total
```

Each domain is a standalone binary. The Go notifications service provided real-time WebSocket push to other domains. Cross-domain communication is HTTP over localhost TCP.

### After: All Rust, single binary

```
┌─────────────────────────────────────────┐
│  stuff8-binary (31MB, 1 process)        │
│                                         │
│  auth ─── profile ─── inventory         │
│    │         │            │              │
│    └── chat ─┴── marketplace ────┤      │
│              │                    │      │
│         notifications ── bidding ─┘      │
│              │                           │
│         email-manager                    │
│                                         │
│  1 tokio runtime, Steer dispatch        │
│  1 port, 1 process unit                 │
└─────────────────────────────────────────┘
```

All 9 domains compile into one binary. The notifications WebSocket hub runs in-process alongside every other domain. Cross-domain HTTP calls hit `localhost:PORT` — same as before, but with one shared tokio scheduler instead of 9 competing ones.

---

## Process Count & Memory

Measured on CT 101 (Intel i3-1220P, 7.3 GiB RAM, shared with 4 other estates):

| Mode | Rust Processes | Go Processes | Total Processes | Memory |
|---|---|---|---|---|
| Multi-binary | 8 | 1 (notifications) | 12 | ~90 MB |
| Single-binary (8 domains) | 1 | 1 (notifications) | 5 | ~60 MB |
| **Single-binary (9 domains)** | **1** | **0** | **3** | **31 MB** |

The final architecture uses **66% less memory** and **75% fewer process units** than the original multi-binary deployment. Zero Go dependencies remain.

---

## Throughput Comparison

Tested at 1,000 concurrent VUs against the homepage (`https://stuff8.com/` through internal gateway `192.168.88.30:23778`), k6 v0.54.0, standard ramp profile (15s up / 30s hold / 15s down):

| Metric | Multi-binary (8 Rust + 1 Go) | Single-binary (8 Rust) | **Single-binary (9 Rust)** |
|---|---|---|---|
| Throughput (req/s) | 396 | 399 | **400** |
| Avg latency | 1,600ms | 1,630ms | **1,600ms** |
| Median latency | 816ms | 753ms | **809ms** |
| P95 latency | 1,190ms | 1,090ms | **1,110ms** |
| Failures | 0% | 0% | 0% |
| Total processes | 12 | 5 | **3** |
| Rust memory | ~80 MB | ~28 MB | **31 MB** |
| All-Rust | No (Go notifications) | No (Go notifications) | **Yes** |

::: info Homepage bottleneck
The homepage test primarily stresses the Astro frontend + Caddy gateway, not the Rust backends. All three configurations show near-identical throughput because the bottleneck is the gateway/frontend layer. A proper API-level stress test would isolate the Rust comparison — the key takeaway is zero regression while adding a domain and eliminating Go.
:::

---

## The Go → Rust Conversion

The original `notifications` service was a ~500-line Go WebSocket hub — the last non-Rust domain in the Stuff8 estate. Rewriting it in Rust removed the final Go dependency and enabled full single-binary composition.

The full story — including side-by-side code comparison of Go's goroutines vs Rust's async/await, what was gained and lost, and when Go is still the right choice — is on its own page:

[The Go → Rust Conversion](/case-study/go-to-rust)

---

## Why This Matters

### For the small team

The original stress test proved you can serve 5,000 concurrent users on a $300 mini PC. This evolution proves you can do it with **one binary, three processes total, and no polyglot overhead**. 31 MB for 9 domains means more room for more estates on the same hardware.

### For the operator

Three units instead of twelve. One binary to build instead of nine. No Go toolchain to provision. The operational simplicity is as valuable as the memory savings.

### For the architecture

`target_mode: single-binary` in `ecompose.yml` lets Eco automatically collapse all Rust domains into one binary. Remove the field and you're back to multi-binary. The same domain code works in both modes — each domain's `bootstrap()` function is the contract. Eco generates the shim, the workspace, the Caddy gateway config, and the service config automatically.

---

## What Changed

1. Every Rust domain was refactored to expose its router as a library (`lib.rs` + `bootstrap()`)
2. A shim crate `stuff8_binary/` was created that depends on all domain libs and merges them via `tower::Steer`
3. The Go `notifications` service was rewritten in Rust and added to the shim
4. `configure.sh` now detects `target_mode: single-binary` and collapses Rust services into one process unit
5. the build ships the single binary instead of per-service binaries

---

## TL;DR

An all-Rust single binary serving 9 domains uses **66% less memory** (31MB vs 90MB) with **75% fewer processes** (3 vs 12) while delivering identical throughput and **zero failures**. The same domain code works in both modes. `target_mode` in `ecompose.yml` is the switch.
