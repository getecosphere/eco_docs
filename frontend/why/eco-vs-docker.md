# Eco vs Docker

The most common question about Eco is: *why not just use Docker?* The short answer: because Eco targets a different — and for many teams, better — point on the isolation-vs-cost curve.

## Why Eco does not use containers

**1. Docker is demanding on the developer workstation.**

Every `docker build` runs a full build inside a container, downloads base images, and layers filesystems on top of each other. Images frequently reach hundreds of megabytes or gigabytes. A team of developers each running several composed stacks is effectively paying for a fleet of mini-servers on every laptop, all day.

**2. Containers are an expensive runtime for agentic AI.**

This matters far more than it used to. When an AI agent (or a vibecoder relying on agents) iterates on a project, it rebuilds, restarts, and probes services constantly. Each cycle with containers means re-inflating a filesystem, re-running image pulls, and waiting on overlay mounts. Eco runs services as **native processes** — the agent edits, restarts, and gets feedback in seconds, not minutes. For teams whose daily driver is an AI assistant, per-cycle cost is the metric that decides the workflow.

**3. The isolation Docker provides is the wrong granularity for most apps.**

Containers isolate *per service*. But what most organizations actually want to isolate is *per application*. Eco moves isolation up to the Proxmox CT boundary — one container (CT) per estate/application — and runs services natively inside it. You get application-level isolation with none of the per-service overhead.

**4. Eco is deliberately young.**

Eco was first committed to on **29 June 2026**. From day one it was designed around host-native operations for a Proxmox base — not as a competitor to Docker, but as the deliberate absence of the container layer. Its "compose" is `ecompose.yml` + `eco up`; its "image" is a provisioned CT template; its "container runtime" is the Proxmox LXC/CT runtime itself.

## Head-to-head comparison

| Concern | Docker Compose | Eco |
| --- | --- | --- |
| **Runtime unit** | container per service | native process per service |
| **Isolation granularity** | per service | per estate (one Proxmox CT) |
| **Reproducibility** | `Dockerfile` image | `provision.sh` runtime install + `ecompose.yml` |
| **Orchestration** | `docker-compose.yml` | `ecompose.yml` + `eco up` |
| **Process manager** | container daemon | PM2 |
| **Dev workstation load** | images, layers, daemon | plain processes + shared runtimes |
| **AI/agent iteration cost** | rebuilds, pulls, overlay mounts | instant native restarts |
| **Registry needed** | image registry (public/private) | none — git repos are the unit |
| **Public exposure** | reverse proxy / cloud provider | Cloudflare Tunnel via proxy CT |
| **Machine boundary** | host or node | Proxmox CT (can host many estates) |
| **Migration** | image portability | CT templates + `ecompose.yml` redeploy |
| **Where it shines** | teams already on Kubernetes-style isolation, per-service scaling | application-scale isolation on Proxmox, agent-driven development |

## Pros and cons, honestly

### Docker's strengths

- Mature, enormous ecosystem; "everything runs in Docker" is often true
- Per-service CPU/memory limits and scaling are first-class
- Image portability across cloud and edge providers
- Huge pool of ready-made public images

### Docker's costs

- Heavy disk and memory footprint on developer machines
- Build/start latency compounds across many services and agents
- Complexity: daemons, networks, registries, volume semantics, rebuild caches
- Per-service isolation is often more than an app actually needs — you pay for it everywhere

### Eco's strengths

- Near-zero overhead: services run as normal processes, restart in milliseconds
- Ideal for AI-agent workflows: edit → restart → verify loops are cheap
- Application-level isolation maps to how teams actually reason about products
- One CT can host many estates, so infrastructure cost stays small
- Everything is declared in one `ecompose.yml` — no Dockerfiles, no registries

### Eco's costs

- Requires Proxmox VE as the host base (a deliberate choice, not a limitation)
- No per-service dynamic scaling inside an estate (see [Scaling](/concepts/scaling))
- Young project: the ecosystem, plugins, and community are being built now
- Portable-image workflows (moving an image to a random VM/cloud) don't apply directly

## When to keep Docker

If you already run Kubernetes, need hard per-service resource isolation, or rely on a container-specific marketplace of images, Docker/K8s is the right tool. Eco is a different philosophy: **native processes, application-scale isolation, on Proxmox** — built for organizations that want to run many composed applications predictably and cheaply, especially with AI in the loop.

See also: [Composition](/concepts/composition) and [Architecture](/reference/architecture).
