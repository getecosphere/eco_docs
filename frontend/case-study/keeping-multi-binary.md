# Keeping Multi-Binary

**The single-binary proof of concept works at 31MB with zero latency regression. But cross-domain calls stay HTTP — not function calls — so `target_mode: multi-binary` works with zero code changes. Here is why.**

The [single-binary stress test](/case-study/single-binary-stress-test) proved you can merge 9 Rust domains into one process, saving 66% memory (31MB vs 90MB) with identical throughput. But that single binary still uses **HTTP loopback** between domains — same `reqwest::Client` hitting `127.0.0.1:{port}` that the multi-binary mode uses. The function-call approach (ports-and-adapters, typed traits, no serialization) was built and compiled successfully, then deliberately **not** merged.

---

## What we built (and shelved)

A `stuff8_port` crate defined 6 typed traits — one per domain capability:

```rust
#[async_trait]
pub trait InventoryPort: Send + Sync {
    async fn get_item(&self, id: &str) -> Result<InventoryItemView, PortError>;
    async fn transfer_owner(…) -> Result<(), PortError>;
}
```

Each domain implemented the traits it owns and consumed the traits it needs — same contract as the HTTP API, but in-process with zero serialization. The shim wired them into a shared `Ports` registry:

```rust
let ports = Ports::default();
let (auth_r, auth_port) = auth::bootstrap().await?;
let (photos_r, photos_port) = photos::bootstrap().await?;
// …
ports.set_auth(auth_port).await;
ports.set_storage(photos_port).await;
// … domains call ports.auth().await?.validate_session(token) at request time
```

It compiled. All ~15 cross-domain call sites were refactored. The isolation guarantees (compile-time: consumers depend only on `stuff8_port`, never on the provider crate; runtime: `Arc<dyn Trait>` is the only reachable handle) were identical to the HTTP boundary.

**We shelved it.** Not because it didn't work — it did. Because it solves the wrong problem.

---

## Why we keep HTTP

| Factor | Function calls (ports) | HTTP loopback |
|---|---|---|
| Latency per cross-domain call | ~microseconds (typed, no serialization) | ~hundreds of microseconds (TCP + JSON) |
| Real user impact | None — homepage bottleneck is frontend/gateway at 809ms median | Same |
| Multi-binary switch | Requires full refactor — ports break when domains are separate processes | `target_mode` toggle, zero code change |
| Independent deploy | Not possible — one binary, one restart | Deploy inventory without touching auth |
| Independent scaling | Not possible — one process, one CPU/memory slot | Per-domain PM2 entries, per-process limits |
| Code surface | 6 new trait impls, ~15 call site changes, a shared DTO crate, a registry | Each domain just calls `reqwest` against an env URL it already has |

The function-call approach shaves microseconds off a test whose median is 809ms. That is noise. What it costs you, permanently, is the ability to split domains back out.

**The real bottleneck is the frontend/gateway**, not the backend topology. All three modes (multi-binary, single-binary 8-domain, single-binary 9-domain) delivered 396–400 req/s at 1.6s average with 0% failures — identical within any reasonable margin of error. The backend could be 50% faster and the user would see zero difference until the frontend/gateway layer is addressed.

---

## The single-binary proof of concept

Single-binary mode is deployed on `stuff8.com` right now and [works in production](/case-study/single-binary-stress-test). The breakthrough:

- **31MB for 9 domains** vs ~90MB across 12 processes
- **3 PM2 entries** (binary + frontend + gateway) vs 12
- **Zero Go** — the notifications service was rewritten in Rust as the final step
- **`target_mode: single-binary`** in `ecompose.yml` — flip it back and you're multi-binary with no domain code changes

The only reason this is possible: every domain exposes a `bootstrap()` → `Router` contract, and the shim dispatches via `tower::Steer`. Cross-domain calls go through the same HTTP paths regardless of mode.

---

## Service-level scaling

In multi-binary mode, eco can scale individual services independently — horizontal (more instances), vertical (more CPU/memory), and eventually automatic (a policy sidecar reading PM2 metrics). The full design, including how Caddy sticky sessions handle stateful WebSocket domains and why HTTP loopback is the enabler, has its own page:

[Future Scaling Features](/case-study/future-scaling-features)

---

## TL;DR

- **Single binary works** (31MB, 400 req/s, 0% failures). It is deployed on `stuff8.com`.
- **Cross-domain HTTP stays.** Function calls save microseconds against a 809ms median bottleneck — not worth losing the ability to split domains apart.
- **`target_mode` in `ecompose.yml`** is the only switch between modes. Zero domain code changes.
- **Service-level scaling** is available in multi-binary mode via `scale:` blocks.
