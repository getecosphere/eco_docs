# The Go → Rust Conversion

**The notifications service was our last Go domain. At ~500 lines it was tiny — but it was also the only reason the Stuff8 estate needed a Go toolchain, a Go build step, and a separate PM2 process. Converting it to Rust removed the last non-Rust dependency from the estate.**

---

## What the Go service did

The `notifications` domain was a self-contained real-time service:

- **Persistent storage**: MongoDB collection for notification documents, indexed by `userId` + `createdAt`
- **REST API**: `GET /api/notifications` (list), `GET /api/notifications/unread-count`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`, `POST /api/notifications/ingest`
- **WebSocket hub**: `GET /api/notifications/ws?token=...` — a persistent connection per user, with an in-memory `map[string]*broadcast.Channel` hub pushing events (new notification, unread count change) in real time
- **JWT authentication**: HS512 token verification using the estate's shared `JWT_SECRET`, identical to auth/chat's verification

Any domain in the estate could produce a notification by calling `POST /api/notifications/ingest` with a valid bearer token and a list of recipient IDs. The service created the notification documents and pushed them to connected users' WebSockets.

The Go code was clean, idiomatic, and battle-tested in production. It used:
- `net/http` with `gorilla/mux` for routing
- `gorilla/websocket` for the WebSocket upgrade and per-connection read/write loops
- `go.mongodb.org/mongo-driver` for MongoDB
- `github.com/golang-jwt/jwt/v5` for HS512 token verification
- `github.com/google/uuid` for ID generation

A single goroutine-per-connection model kept the code flat — no async/await, no event loop, no channels between workers. Just `for { conn.ReadMessage() }` in a goroutine.

---

## Why convert it

The Go service was not broken. It was **the only non-Rust domain in the estate**.

The Stuff8 estate had 9 domains. 8 were Rust (auth, profile, photos, inventory, marketplace, bidding, chat, email-manager). One was Go. This meant:

1. **Two toolchains on every CT**: Rust (`cargo`, `rustc`) and Go (`go`, `gcc`). Eco provisions both, but provisioning one is cheaper than two.
2. **Two build systems**: builds ran `cargo build` for 8 crates and `go build` for 1. Two separate caching strategies, two potential build failures.
3. **One extra process**: `pm2 ls` showed 12 entries instead of 11. The Go service consumed ~10 MB — small, but not zero.
4. **Single-binary roadblock**: The `target_mode: single-binary` experiment collapsed all Rust domains into one binary using a Cargo workspace. Go can't participate in a Cargo workspace. The Go service was the only thing keeping the estate from being truly unified.

Items 1–3 were annoyances. Item 4 was the real motivator.

---

## The conversion

The Rust rewrite mirrored the Go service 1:1 in contract and behavior. Every endpoint, every MongoDB document shape, every WebSocket frame, every JWT claim — identical.

| Aspect | Go | Rust |
|---|---|---|
| HTTP framework | `net/http` + `gorilla/mux` | `axum` 0.7 |
| WebSocket | `gorilla/websocket` | `axum` built-in WebSocket (`ws` feature) |
| MongoDB | `go.mongodb.org/mongo-driver` | `mongodb` 2.8 |
| JWT | `golang-jwt/jwt` v5 | `jsonwebtoken` 9 |
| ID generation | `google/uuid` | `uuid` 1 (v4) |
| In-memory hub | `sync.Map` + `broadcast.Channel` | `tokio::sync::{RwLock<HashMap>, broadcast::channel}` |
| Concurrency | goroutine per connection | `tokio::spawn` + async event loop (select over stream, ping ticker, incoming frames) |
| Lines of code | ~480 | ~480 |

**The line count ended up nearly identical.** Go's goroutines and Rust's async/await produced roughly equivalent code density for this workload — a connection-heavy WebSocket service with a modest REST API. Neither language was "more concise" in a meaningful way.

The biggest difference was in the WebSocket event loop:

```go
// Go: goroutine per connection
for {
    select {
    case msg := <-hubStream:
        conn.WriteMessage(websocket.TextMessage, msg)
    case <-ticker.C:
        conn.WriteMessage(websocket.PingMessage, nil)
    }
}
```

```rust
// Rust: async event loop with tokio::select
loop {
    tokio::select! {
        event = stream.recv() => { /* push to socket */ },
        _ = ping.tick() => { /* send ping */ },
        incoming = receiver.next() => { /* handle client close */ },
    }
}
```

Both are clean. The Go version is slightly more readable (no `tokio::pin!`, no `StreamExt`). The Rust version is slightly more explicit about which branch handles which event. Pick your poison.

---

## What was gained

### Unification

The Go → Rust conversion was the last piece needed to make the Stuff8 estate 100% Rust. After the conversion:

- **Zero Go toolchain** on the CT — `go` and `gcc` are no longer provisioned for Stuff8
- **One build system**: `cargo build --release -p stuff8-binary` builds everything
- **One PM2 process** for all 9 domains (via `target_mode: single-binary`) instead of 12

### A simpler estate

Three processes (binary, frontend, gateway) instead of twelve. `pm2 ls` went from a scrollable page to a handful of entries. Logs went from 9 separate files to one structured JSON stream. Restarts went from 9 sequential PM2 commands to one.

### Proved that Go ↔ Rust porting is cheap

At ~500 lines with identical MongoDB schemas and JWT verification, the conversion took hours, not days or weeks. For any future domain where Go is a better fit (e.g., a connection-heavy real-time service that is NOT going to be part of a single binary), the cost of rewriting in Rust later — or the reverse — is trivially low.

> Why is Go better for connection-heavy real-time services? Go's goroutine model lets you write `for { conn.ReadMessage() }` without an event loop or `select!`. Each of 10,000 concurrent WebSocket connections is a goroutine that blocks on reads. The Go runtime multiplexes them onto a handful of OS threads transparently. In Rust you need `tokio::select!` with a `FuturesUnordered` spawn-per-connection, or an actor model — either way, more ceremony than a `for` loop. For a pure real-time hub with no single-binary requirement, Go's goroutine-per-connection is the simpler, safer, and more readable pattern.

---

## What was lost

### One great goroutine story

Go's goroutine-per-connection model is genuinely elegant for WebSocket hubs. Each connection is a goroutine that blocks on reads and sends; the runtime multiplexes thousands of them onto a handful of OS threads. The Rust version uses an async event loop with `tokio::select!`, which is fine but takes a moment longer to reason about.

### "Boring" guarantees

Go's `gofmt` enforces a single code style. The standard library is large, mature, and consistent. Rust's ecosystem is more fragmented: `axum` vs `actix-web`, `tokio` vs `async-std`, `serde_json` vs `simd-json`. These are not problems, but they are decisions Go spares you from making.

### A polyglot safety net

Having one Go service meant the estate was not a Rust monoculture. If a Rust toolchain issue blocked all 8 Rust domains, the Go service kept running — and vice versa. This "don't put all your eggs in one compiler" benefit was real, if academic.

---

## Would we do it again

For a standalone service, Go remains an excellent choice in any Eco estate. The runtime footprint is nearly identical to Rust (10–20 MB binary, 8–12 MB memory idle, sub-ms startup). For a connection-heavy WebSocket hub, Go's goroutine model is arguably more natural than Rust's async/await.

The conversion was worth it **only** because the estate already had 8 Rust domains and wanted single-binary composition. In a greenfield Eco estate with no other Rust services, writing `notifications` in Go would have been the right call.

See: [Why Go](/why/why-golang), [Why Rust](/why/why-rust), [Single-Binary Stress Test](/case-study/single-binary-stress-test).
