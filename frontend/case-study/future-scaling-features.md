# Future Scaling Features

**Eco can already scale services vertically and horizontally in multi-binary mode. Auto-scaling — the policy engine that reads process metrics and fires scale events automatically — is designed but not yet built.**

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

1. **Process metrics**: per-service CPU and memory (systemd `MemoryMax`/`CPUQuota`, or `pm2 ls` in dev)
2. **`eco scale <service> +1`**: deploys a new replica onto an available CT
3. **Caddy hot-reload**: upstream changes are applied with zero downtime via `caddy reload`

The missing piece is a **policy sidecar** — a lightweight process that:

- Reads per-service metrics every 30 seconds
- When a service exceeds 80% CPU or memory for 2 consecutive windows, fires `eco scale <service> +1`
- When a service is below 20% CPU and memory for 5 consecutive windows, fires `eco scale <service> -1` (with a minimum of 1 replica)
- Regenerates the Caddy upstream and reloads

With multi-binary HTTP loopback, a new replica joins the upstream and traffic flows immediately — no in-process wiring to update, no shared state to synchronize. The HTTP contract is the boundary, and it works the same whether the target is one instance or three.

---

## Why multi-binary makes this possible

Scaling a single service in single-binary mode is not possible — the whole estate shares one process. In multi-binary mode, each domain is an independent unit with its own CPU/memory footprint, its own log stream, its own restart cycle. `eco scale` operates on that granularity.

This is why the cross-domain HTTP loopback is kept: it is the same protocol whether the target is `127.0.0.1:8083` (localhost, single-binary) or `192.168.88.31:8083` (another CT, multi-binary). The scaling machinery does not need to know which mode the estate runs in — it just updates the upstream and reloads Caddy.

---

## How Docker and Kubernetes do it — and how eco differs

The industry standard for scaling services is container orchestration, most commonly Docker (Swarm or standalone) and Kubernetes. Eco takes a different path: native binaries on Proxmox CTs, managed by systemd. Here is the technical comparison — not a competition, but a clear picture of what each approach actually does.

### Unit of deployment

| | Docker / Kubernetes | Eco |
|---|---|---|
| What gets deployed | An OCI container image — a tarball of the entire root filesystem (OS userspace, glibc, Node/JVM/Go runtime, `node_modules`, app code). A typical Node container is 150–400 MB compressed. | A single native binary (Rust: 1–31 MB; Go: 10–20 MB) or a Bun-compiled / static frontend. No filesystem duplication, no `node_modules` on the CT. |
| Startup | Container runtime pulls the image, unpacks layers, creates namespaces, starts the process. Cold start: seconds (pull + unpack). Warm start: ~1s. | systemd starts the process. Warm start: milliseconds — binary is already on disk, systemd just execs it. |
| Build step | `docker build` produces the image, pushed to a registry (Docker Hub, ECR, GCR, self-hosted). CI pipeline must build + push. | Built on the developer machine (`eco up --remote` cross-compiles + ships). No build step on the CT, no registry. |

### Orchestration

| | Docker / Kubernetes | Eco |
|---|---|---|
| Control plane | kube-apiserver → etcd → kube-controller-manager → kube-scheduler. A distributed consensus system running across 3+ master nodes. | systemd on each CT, driven by the `eco serve` agent on the host that runs explicit deploys. No distributed consensus — systemd is a local process manager. |
| Declarative state | `kubectl apply -f deployment.yaml` — the control plane continuously reconciles desired state with actual state. This is Kubernetes's core idea: a reconciliation loop. | `ecompose.yml` declares the estate topology. `eco up --remote` ships the local source + artifacts and converges in one pass (provision CTs, install artifacts, write configs, start units). No continuous reconciliation — changes are explicit deploys. |
| Scheduling | kube-scheduler scores every node (CPU/memory available, affinity/anti-affinity, taints/tolerations) and picks the best one. A pod's `spec.nodeName` is only set after scheduling. | Eco places a service on a CT based on `ecompose.yml` domain assignments. There is no dynamic scheduler — the developer declares which CT a domain lives on. `scale.across: any` tells eco to pick any CT with capacity. Simple, manual, predictable. |

### Service discovery and networking

| | Docker / Kubernetes | Eco |
|---|---|---|
| Service identity | Every pod gets a unique cluster IP and a DNS name (`service.namespace.svc.cluster.local`). kube-proxy maintains iptables/ipvs rules to route virtual IPs to pod IPs. DNS updates are handled by CoreDNS, watching the API server. | A domain is identified by its unit name and its TCP port on the CT. Caddy is the L7 reverse proxy — it maps hostnames to `127.0.0.1:{port}` or remote CT IPs. No virtual IPs, no iptables rules, no DNS-based discovery. |
| Load balancing | kube-proxy (L3/L4) distributes across pod IPs. An Ingress controller (nginx-ingress, traefik, Caddy) adds L7 routing. Two layers of balancing by default. | Caddy alone — L7 reverse proxy with round-robin across upstreams. Caddy also handles TLS termination, header-based sticky sessions, and HTTP→HTTPS redirects. One layer, one config file. |
| Network overlay | CNI plugins (flannel, calico, cilium) build an overlay network so pods on different nodes can reach each other by IP. This adds encapsulation overhead (VXLAN, Geneve) unless using BGP-based CNI. | No overlay. All CTs share the Proxmox host's bridge (`vmbr0`). A service on CT A reaches a service on CT B via the physical bridge — same IP, no encapsulation. |

### Auto-scaling

| | Docker / Kubernetes | Eco |
|---|---|---|
| Horizontal Pod Autoscaler (HPA) | Built into the control plane. Metrics-server collects pod CPU/memory via the kubelet's cAdvisor. HPA queries the metrics API every 15s and computes `desiredReplicas = ceil(currentReplicas * currentMetric / targetMetric)`. Scale-up is capped at 2x per 15s interval to prevent flapping. Scale-down has a 5-minute stabilization window. HPA can also use custom metrics (Prometheus, Datadog) via the external metrics API. | Designed as a policy sidecar. systemd's cgroup accounting (or `pm2 ls` in dev) exposes per-process CPU/memory. The sidecar reads it every 30s and fires `eco scale <service> ±1`. Thresholds: scale-up at >80% for 2 windows, scale-down at <20% for 5 windows. No external metrics API yet — the design is intentionally simpler than HPA because the process count is an order of magnitude smaller. |
| Vertical Pod Autoscaler (VPA) | Recommends or auto-updates pod resource requests/limits based on historical usage. Uses a recommender → updater → admission controller pipeline. Pods are evicted and rescheduled to apply changes. | `scale.cpu` and `scale.memory` in `ecompose.yml` adjust the CT's Proxmox resource limits directly — no eviction, just a CT config update and unit restart. The domain process sees the new cgroup limits natively. |
| Event-driven scaling (KEDA) | KEDA (Kubernetes Event-Driven Autoscaling) scales pods based on external event sources — Kafka topic lag, Redis list length, cron schedules, cloud provider metrics. It can scale to zero (no pods running) and back up when an event arrives. | Not needed at eco's current scale. Eco's domains are always-on HTTP services, not event consumers. If a domain needs it later (e.g., a batch processor), a cron-based scale-to-1 and idle-exit pattern achieves the same with no external deps. |
| Node auto-scaling (Cluster Autoscaler) | When pods can't be scheduled because of insufficient cluster resources, the Cluster Autoscaler provisions a new VM (via cloud provider API) and joins it to the cluster. | When CT capacity runs out, eco can provision a new Proxmox CT from a template (`vztmpl/eco-npm-rust-mongo_...`), install dependencies, and add it to the estate. The CT template is pre-built with the tools the estate needs (Rust, Node, MongoDB). This is `scale.across: any` — if no existing CT has room, eco provisions a new one. |

### Isolation boundary

| | Docker / Kubernetes | Eco |
|---|---|---|
| Process isolation | Linux namespaces (pid, net, mnt, uts, ipc, user) + cgroups per container. Shared kernel. A kernel panic in one container panics the whole node. | Proxmox CT (LXC) — also namespaces + cgroups, but with AppArmor/SELinux profiles and seccomp filters that the Proxmox hypervisor configures. Still a shared kernel, but Proxmox's LXC integration is older and more battle-hardened than Docker's default profile. |
| Resource limits | Kubernetes `resources.requests` and `resources.limits` — the kubelet enforces them via cgroups. CPU is compressible (throttled, not killed). Memory is incompressible — exceed the limit and the pod is OOM-killed. | Proxmox CT resource limits (`cores`, `memory`, `swap`) set in `ecompose.yml`. The hypervisor enforces them via cgroups at the CT level. Same compressibility rules: CPU throttled, memory OOM-killed. The difference: a CT is a whole OS, so OOM-killing a CT kills every process inside it — all the estate's domains, not just one service. |
| Security boundary | A container breakout is a Linux kernel exploit — rare but catastrophic when it happens. Root in a container is the same root as the host (unless user namespaces are enabled, which is uncommon). | A CT breakout is also a kernel exploit. Proxmox's unprivileged CTs (`unprivileged: 1` in `ecompose.yml`) map root inside the CT to a high UID on the host (e.g., 100000) — escaping root-in-CT to root-on-host requires a kernel exploit AND a UID-mapping bypass. Marginally harder than Docker. Neither is a VM-level isolation. |

### Pros and cons summary

| | Docker / Kubernetes | Eco |
|---|---|---|
| **Pros** | Industry-standard API (any dev knows `kubectl`), massive ecosystem (Helm charts, operators, ingress controllers, monitoring stacks), cloud-provider-agnostic deployment, fine-grained pod-level resource isolation, HPA is built-in and battle-tested at global scale, KEDA scales to zero | No container overhead (no image pull, no registry, no overlay network), native binary size (1–31 MB vs 150–400 MB images), L7 routing in one Caddyfile instead of Ingress + kube-proxy, Proxmox CT isolation is stronger than default Docker, process count is small enough that per-service metrics replace an observability stack, single-machine deployment works (no cluster required) |
| **Cons** | Operational complexity — a production cluster needs etcd, control plane, CNI, CSI, load balancer integration, cert-manager, logging/monitoring stack. A team of one cannot responsibly run Kubernetes in production at 2 AM. The minimum viable cluster for reliability is 3 nodes. Image pull at scale is slow without a local registry cache. | No continuous reconciliation — `eco up --remote` is explicit, so config drift is not auto-healed. systemd is local per-CT, no cluster-wide process view. No equivalent of Helm/Kustomize for templating. Scaling to zero is not yet implemented. No community ecosystem of pre-built charts/operators — every domain is custom. |

The bottom line: Kubernetes is the right answer when you have a team of platform engineers, hundreds of services, and a cloud provider budget. Eco is the right answer when you have one developer, 9 domains, and a $300 mini PC. Both work. They solve different versions of "scaling."

Horizontal scaling assumes each instance is stateless (it can be). For domains that hold in-memory state (WebSocket hubs, caches, session stores in chat/notifications), horizontal scaling requires that state to be shared or partitioned:

- **Chat and notifications** WebSocket hubs are per-user — a user's connection lives on one instance. Caddy's `lb_policy header X-User-Id` sticky-session mode routes each user consistently.
- **Redis** (already provisioned for chat) can back any domain that needs cross-instance state (session stores, rate-limit counters, pub/sub for real-time events).

This is planned architecture, not yet deployed. The current Stuff8 estate runs on one CT in single-binary mode — scaling is not needed at its current load.

See: [Keeping Multi-Binary](/case-study/keeping-multi-binary), [Single-Binary Stress Test](/case-study/single-binary-stress-test).
