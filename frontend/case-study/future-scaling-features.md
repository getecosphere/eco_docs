# Future Scaling Features

**Eco can already scale services vertically and horizontally in multi-binary mode. Auto-scaling — the policy engine that reads PM2 metrics and fires scale events automatically — is designed but not yet built.**

---

## Horizontal scaling (more instances)

A `scale` block in `ecompose.yml` declares replicas:

```yaml
services:
  marketplace-backend:
    path: marketplace/backend
    scale:
      instances: 3
      across: any
    runtimes:
      - rust
      - mongodb@7
```

Eco clones the repo onto each target CT, builds the binary, writes a per-instance `.env` with shared secrets, and regenerates the Caddy upstream with all instance addresses. Because every domain talks HTTP, the load-balanced `marketplace-backend` looks like one service to every other domain — no code change anywhere.

Caddy handles the distribution:

```
reverse_proxy marketplace-backend {
    to 192.168.88.30:8083
    to 192.168.88.31:8083
    to 192.168.88.32:8083
}
```

Round-robin, zero configuration from the calling domains.

---

## Vertical scaling (more resources per instance)

```yaml
services:
  marketplace-backend:
    scale:
      cpu: 4
      memory: 2048
```

Eco adjusts the CT's resource limits and restarts the service. No domain code changes. This is useful when a service is I/O or CPU-bound on one CT but distributing it across multiple CTs is overkill — a single beefed-up instance handles the load.

---

## Auto-scaling (designed, not built)

The infrastructure primitives for auto-scaling are already in place:

1. **PM2 metrics**: `pm2 ls` emits per-process CPU and memory, already used in deploy webhook health checks
2. **`eco scale <service> +1`**: deploys a new replica onto an available CT
3. **Caddy hot-reload**: upstream changes are applied with zero downtime via `caddy reload`

The missing piece is a **policy sidecar** — a lightweight process that:

- Reads PM2 metrics for each service every 30 seconds
- When a service exceeds 80% CPU or memory for 2 consecutive windows, fires `eco scale <service> +1`
- When a service is below 20% CPU and memory for 5 consecutive windows, fires `eco scale <service> -1` (with a minimum of 1 replica)
- Regenerates the Caddy upstream and reloads

With multi-binary HTTP loopback, a new replica joins the upstream and traffic flows immediately — no in-process wiring to update, no shared state to synchronize. The HTTP contract is the boundary, and it works the same whether the target is one instance or three.

---

## Why multi-binary makes this possible

Scaling a single service in single-binary mode is not possible — the whole estate shares one process. In multi-binary mode, each domain is an independent PM2 entry with its own CPU/memory footprint, its own log stream, its own restart cycle. `eco scale` operates on that granularity.

This is why the cross-domain HTTP loopback is kept: it is the same protocol whether the target is `127.0.0.1:8083` (localhost, single-binary) or `192.168.88.31:8083` (another CT, multi-binary). The scaling machinery does not need to know which mode the estate runs in — it just updates the upstream and reloads Caddy.

---

## What about stateful domains?

Horizontal scaling assumes each instance is stateless (it can be). For domains that hold in-memory state (WebSocket hubs, caches, session stores in chat/notifications), horizontal scaling requires that state to be shared or partitioned:

- **Chat and notifications** WebSocket hubs are per-user — a user's connection lives on one instance. Caddy's `lb_policy header X-User-Id` sticky-session mode routes each user consistently.
- **Redis** (already provisioned for chat) can back any domain that needs cross-instance state (session stores, rate-limit counters, pub/sub for real-time events).

This is planned architecture, not yet deployed. The current Stuff8 estate runs on one CT in single-binary mode — scaling is not needed at its current load.

See: [Keeping Multi-Binary](/case-study/keeping-multi-binary), [Single-Binary Stress Test](/case-study/single-binary-stress-test).
