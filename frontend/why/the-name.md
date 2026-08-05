# Why the name "eco"

eco comes from **ecology** — the study of how organisms interact with each other and their environment to form a self-sustaining whole.

## Not a single solution — a complete one

The name is a deliberate statement of philosophy:

> eco is not just a single solution. It is a complete and holistic solution.

A tool like Docker solves *packaging*. A platform like Kubernetes solves *scheduling*. A framework like Rails solves *a web app*. Each one is a single layer.

eco's ambition is an **ecosystem** — the whole system working together:

- **Domains** are the species — independent, reusable bounded contexts
- **Estates** are the habitats — where domains live and interact
- **The Proxmox CT** is the environment — the machine boundary that hosts life
- **eco itself** is the ecology — the web of relationships, dependencies, and shared runtime that keeps everything alive and self-sustaining

## Just like a biological ecology

In a real ecology, an organism survives not in isolation but because the ecosystem around it provides what it needs — food, shelter, waste processing. When a new organism arrives, it doesn't build the ecosystem from scratch; it plugs into one that already works.

eco works the same way:

- A new domain arrives with a clear **contract** and is plugged into the existing estate
- Supporting capabilities — auth, photos, notifications, storage — are already there
- The new domain composes, is wired, exposed, and monitored without rebuilding the world

## Self-sustaining

The root of "ecology" is *oikos* — the Greek word for *household* or *home*. A healthy ecology is one that sustains itself. eco estates are built to do exactly that:

- **Reproducible** — `ecompose.yml` + provisioned runtimes mean an estate can be rebuilt from scratch
- **Self-deploying** — push to `main` and the webhook rebuilds the estate
- **Self-hosting** — natively on Proxmox, no per-service daemons to babysit
- **Self-sustaining** — reusable domains keep feeding new estates, so effort compounds

## The mark

The eco mark is a constellation — a set of nodes connected into a whole. One node alone is a dot; together they form a system. That is the ecological view: **no single solution, but a complete, holistic one.**

See also: [eco vs Docker](/why/eco-vs-docker), [The end-to-end model](/why/end-to-end).
