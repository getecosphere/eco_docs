# Case Study: Stuff8

Stuff8 is a production estate built with Ecosphere — a **personal inventory system** whose inventory can optionally become a public marketplace. It demonstrates the full composition model: ten independent domains composed into one application, deployed on a shared CT, exposed through a single hostname.

> **Study the model, not the business.** This page uses Stuff8 to show how Ecosphere composes real, independent domains into a working estate.

## The composition

Stuff8 composes these domains:

| Domain | Role | Requires | Stack |
| --- | --- | --- | --- |
| `auth` | Authentication system | — | Rust (axum) · MongoDB · JWT · bcrypt |
| `photos` | S3/MinIO media storage | auth | Rust · MinIO/S3 · image processing |
| `inventory` | Personal asset management | auth, photos | Rust · MongoDB |
| `marketplace` | Public projection of sellable items | auth, inventory, photos, notifications | Rust · MongoDB |
| `bidding` | Offers, buyer selection, negotiation | auth, inventory, notifications | Rust · MongoDB |
| `chat` | Realtime conversations | auth, photos, notifications | Rust · MongoDB · Redis · WebSocket |
| `notifications` | In-app notifications + realtime | auth | Go · MongoDB · WebSocket |
| `profile` | User profile domain | auth | Rust · MongoDB |
| `rag` | Estate-aware Q&A (DeepSeek grounding) | — | Rust (axum) · MongoDB · fastembed/ONNX |
| `stuff8_core` | Estate core: ecompose.yml + Astro.js frontend | auth, photos, inventory, marketplace, bidding, notifications | Astro.js · Tailwind CSS · Node 20 |

Ten independent repositories, each with its own contract, persistence, and runtime — composed into a single estate and deployed on **one** CT.

## One estate, ten languages stacks, one host

The mix of runtimes shows Ecosphere's language-agnosticism in practice:

- **10 Rust services** (auth, photos, inventory, marketplace, bidding, chat, profile, notifications, rag + the frontend build toolchain)
- **1 Node.js/Astro frontend** (stuff8_core)

All of them run natively on CT 101 under systemd, share the same wiring model (ports, `.env`, gateway), and are managed by one `eco up --remote`. Stuff8 runs in **multi-binary mode**: each domain is its own release binary and unit, so services can be scaled and restarted independently.

## Deployment flow

```mermaid
flowchart TD
    subgraph GitHub
        A[auth] --> G
        B[photos] --> G
        C[inventory] --> G
        D[marketplace] --> G
        E[bidding] --> G
        F[chat] --> G
        H[notifications] --> G
        I[rag] --> G
        G[stuff8_core]
    end

    G --> M[ecompose.yml]
    M --> U[eco up]

    subgraph CT101[CT 101 - shared]
        U --> P[provision.sh<br/>runtimes]
        P --> W[configure.sh<br/>ports .env JWT systemd]
        W --> S1[stuff8-frontend]
        W --> S2[photos-backend]
        W --> S3[auth-backend]
        W --> S4[marketplace-backend]
        W --> S5[bidding-backend]
        W --> S6[notifications-backend]
        W --> S7[rag-backend]
    end

    S1 --> GATE[Caddy gateway<br/>internal port]
    GATE --> CF[Cloudflare Tunnel]
    CF --> DNS[stuff8.com]
    DNS --> USER[Browser]
```

1. **Repos** — each domain lives in its own repository; `stuff8_core` is the estate core repo (owning `ecompose.yml`) that pulls them together
2. **ecompose.yml** — declares the estate: CT 101, the ten domains, the services, the `stuff8.com` hostname
3. **eco up --remote** — builds locally, ships artifacts, provisions runtimes, wires `.env` + ports + JWT, generates config, starts services
4. **Gateway** — Caddy routes `/` to the frontend, `/auth-api/*` to auth, `/api/*` to the backends
5. **Exposure** — Cloudflare Tunnel → proxy CT → gateway → services, all under one hostname

## Inventory-first user journey

Stuff8's differentiator is "Inventory First, Marketplace Second". The inventory is the source of truth; the marketplace is only a view.

```mermaid
flowchart LR
    A[Own something] --> B[Inventory it<br/>photos + details]
    B --> C[Manage it<br/>search, categorize, value]
    C --> D{Sellable?}
    D -->|No| E[Stays private inventory]
    D -->|Yes| F[Appears on marketplace]
    F --> G[Buyer submits offer]
    G --> H[Owner accepts<br/>+ chat negotiation]
    H --> I[COD transaction]
    I --> J[Provenance record]
```

- **Inventory is the source of truth** — marketplace is a filtered projection (`WHERE sellable = true`), never a duplicate
- **Selling is one click** — toggle `sellable`, the inventory item becomes a listing; no re-uploading photos or rewriting descriptions
- **Offers, not checkout** — buyers submit offers, owners accept/reject/negotiate in realtime chat
- **COD transactions** — the app connects buyers and sellers; payment happens offline
- **Provenance** — every SOLD records an ownership history entry

## What this estate demonstrates

- **Reusable domains** — `auth`, `photos`, `chat`, `notifications`, and `rag` are not Stuff8-specific; they are composed into other estates too
- **Pluggable capability** — the `rag` domain was added to an already-running estate by cloning it and adding two lines to `ecompose.yml`; no existing service changed
- **Language-agnostic** — Rust, Go, and Node services coexist natively on one CT
- **Shared CT** — CT 101 hosts multiple estates, each with its own ports, `.env`, systemd units, and databases
- **One hostname** — external traffic is `stuff8.com`, with `photos.stuff8.com` as an `expose.additional` for the media backend
- **Explicit deploys** — `eco up --remote` (and `--staging`) from the developer machine

## Stress tested to 5,000 concurrent users

Stuff8 was penetration-tested at 1,000 → 5,000 concurrent virtual users on the same $300 mini PC that runs it in production. Results:

| VUs | Avg | Failures | Req/s |
|---|---|---|---|
| 1,000 | 288ms | 0% | 2,767 |
| 5,000 | 1,601ms | 0% | 1,920 |

Ten Rust services and one Astro frontend, zero failures at 5,000 concurrent users on shared hardware. The full methodology and raw data — including a direct Rust-vs-Java comparison on the same machine — is in the [Stress Testing at Scale](/case-study/stress-test) report.

## Two footprints: prod and staging

Stuff8 also demonstrates Ecosphere's **prod/staging workflow**. The estate declares a
staging footprint in `ecompose.yml`, so it runs two deployments from the same
manifest:

- **Production** — https://stuff8.com (CT 101)
- **Staging** — https://staging.stuff8.com (CT 1000)

A push to a feature branch deploys to staging; a push to `main` deploys to
production. See the [Prod & Staging Workflow](/guide/prod-staging-workflow).

## Try it live

The estate is deployed at **https://stuff8.com**, with the staging preview at
**https://staging.stuff8.com**. `eco up` built them from the
`stuff8_core` estate manifest and the composed domains above.
