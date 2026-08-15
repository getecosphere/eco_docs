# Domains

The core unit of the Eco model is the **domain** — a bounded context that is also a reusable operational unit.

## What makes a domain reusable

A domain is not only a code module. To be truly reusable, it must stand on its own:

- a domain must not depend on another domain's internal persistence
- a domain must not leak solution-specific assumptions into its contract
- a domain must not require hidden runtime knowledge to be usable
- a domain must expose explicit dependencies and explicit integration points

Separate repositories alone do not create reusable domains. **Independence does.**

## One repo, one subsystem

Each domain lives in its own git repository, structured into:

- `backend/` — the domain's service (most domains)
- `frontend/` — sometimes, when the domain owns UI

`auth` is the clearest example: it lives in its own repo and serves as a reusable domain across multiple solutions, not just one.

## The dependency graph

Reusable capabilities are versioned **LXS** packages resolved from the
[LXS registry](/ecosphere/lxs-registry); source-composed domains (`path:`
services) ship from the developer workspace. Dependencies are declared
explicitly so they are visible at composition time — each domain's contract
(`lxs.yml` or `README.md`) lists what it requires.

## Dependencies are explicit

When a frontend composes a sibling domain, it declares the peer URL in `.env.example` (empty value), and Eco fills it against the discovered service:

```
PUBLIC_PROFILE_URL=
PUBLIC_PHOTOS_URL=
```

The composition layer normalizes shared state (ports, `.env`, JWT secrets) so domains plug together without manual wiring.

## Long-term goal

A catalog of reusable domains that can be recomposed into new application estates. A new solution is buildable from stable domains plus whatever logic is actually unique to that solution.

## Examples

- `auth` — authentication system
- `photos` — S3/MinIO-backed media storage
- `chat` — persistent conversations + WebSocket delivery
- `bidding` — offers, buyer selection, negotiation
- `notifications` — in-app notifications + realtime delivery
- `inventory` — personal asset management
- `marketplace` — a public projection of sellable inventory
